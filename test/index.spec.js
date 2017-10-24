/* eslint-env node, mocha */
require('chai')
  .should()
const dataplugCsv = require('../lib')

describe('dataplug-csv', () => {
  it('should have "CsvStreamWriter" class', () => {
    dataplugCsv
      .should.have.property('CsvStreamWriter')
      .that.is.an('function')
  })
})
