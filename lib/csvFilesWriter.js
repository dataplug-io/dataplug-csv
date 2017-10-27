const _ = require('lodash')
const csv = require('csv')
const { Writable } = require('stream')
const path = require('path')
const fs = require('fs')
const Promise = require('bluebird')

Promise.promisifyAll(fs)

/**
 * Writes input object stream to target directory in CSV format
 */
class CsvFilesWriter extends Writable {
  /**
   * @constructor
   *
   * @param {string} [collection] Collection name, used as prefix for files
   * @param {string} [targetDir=undefined] Target directory. Current working directory is not defined
   * @param {Object} [options=undefined] Options, see http://csv.adaltas.com/stringify/#options
   * @param {string} [entityNameSeparator='/'] entity name separator
   * @param {string} [safeEntityNameSeparator='---'] Path-safe entity name separator
   */
  constructor (collection, targetDir = undefined, options = undefined, entityNameSeparator = '/', safeEntityNameSeparator = '---') {
    super({
      objectMode: true
    })

    this._collection = collection
    this._targetDir = targetDir || process.cwd()
    this._options = Object.assign({}, options)
    this._entityNameSeparator = entityNameSeparator
    this._safeEntityNameSeparator = safeEntityNameSeparator
    this._targetStreams = null
  }

  /**
   * https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback_1
   */
  _write (chunk, encoding, callback) {
    if (!this._targetStreams) {
      fs.lstatAsync(this._targetDir)
        .then((stats) => {
          if (!stats.isDirectory()) {
            return fs.mkdirAsync(this._targetDir)
          }
        })
        .catch((err) => {
          if (err.code === 'ENOENT') {
            return fs.mkdirAsync(this._targetDir)
          }
          callback(err)
        })
        .then(() => {
          this._targetStreams = {}
          this._write(chunk, encoding, callback)
        })
        .catch((err) => {
          callback(err)
        })
      return
    }

    const entities = _.keys(chunk)
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i]
      const data = chunk[entity]

      // Do not create target stream unless there's data for it
      if (data.length === 0) {
        continue
      }

      // Open target streams on demand
      let targetStream = this._targetStreams[entity]
      if (!targetStream) {
        const options = Object.assign({}, this._options, {
          columns: _.keys(data[0])
        })
        const csvStream = csv.stringify(options)
        let filePath
        if (entity.length === 0) {
          filePath = path.join(this._targetDir, `${this._collection}.csv`)
        } else {
          const safeEntityName = entity
            .replace(this._entityNameSeparator, this._safeEntityNameSeparator)
            .replace(/[/\\]/g, '_')
          filePath = path.join(this._targetDir, `${this._collection}${this._safeEntityNameSeparator}${safeEntityName}.csv`)
        }
        const fileStream = fs.createWriteStream(filePath)
        csvStream
          .pipe(fileStream)
        targetStream = this._targetStreams[entity] = csvStream
      }

      const dataLength = data.length
      for (let j = 0; j < dataLength; j++) {
        targetStream.write(data[j])
      }
    }

    callback()
  }

  /**
   * https://nodejs.org/api/stream.html#stream_writable_destroy_err_callback
   */
  _destroy (err, callback) {
    const entities = _.keys(this._targetStreams)
    for (let i = entities.length - 1; i >= 0; i--) {
      this._targetStreams[entities[i]].destroy(err)
    }
    this._targetStreams = null

    if (callback) {
      callback(err)
    }
  }

  /**
   * https://nodejs.org/api/stream.html#stream_writable_final_callback
   */
  _final (callback) {
    const entities = _.keys(this._targetStreams)
    for (let i = entities.length - 1; i >= 0; i--) {
      this._targetStreams[entities[i]].end()
    }
    this._targetStreams = null

    if (callback) {
      callback()
    }
  }
};

module.exports = CsvFilesWriter