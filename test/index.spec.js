/* eslint-env node, mocha */
require('chai')
  .should()
const dataplugCsv = require('../lib')

describe('dataplug-csv', () => {
  it('should have "CsvFilesWriter" class', () => {
    dataplugCsv
      .should.have.property('CsvFilesWriter')
      .that.is.an('function')
  })
})
