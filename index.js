const fs = require('fs');
const path = require('path');
const XmlStream = require('xml-stream');
const { Command } = require('commander');
const libxmljs = require('libxmljs');
const program = new Command();

const ENCODING_UTF8 = 'utf8';

program
    .requiredOption('-i, --input <path>', 'Input XML file path', )
    .requiredOption('-o, --output <path>', 'Output XML file path')
    .requiredOption('-c, --currency <string>', 'The currency to convert the prices to', validateCurrencyCode, 'RON')
    .requiredOption('-r, --exchangeRate <number>', 'Exchange rate between the old and new currencies', parseFloat, 5.03)
    .option('-x, --xsd <path>', 'XSD file path for validation', 'pricebook.xsd');

program.parse(process.argv);

const { input, output, currency, exchangeRate, xsd } = program.opts();

const inputStream = fs.createReadStream(input,  {encoding: ENCODING_UTF8});
const outputStream = fs.createWriteStream(output, {encoding: ENCODING_UTF8});
const xml = new XmlStream(inputStream);

outputStream.write('<?xml version="1.0" encoding="UTF-8"?>\n');

xml.on('updateElement: header', header => {
    header.currency = currency;
    const newPricebookID = path.parse(output).name;
    header.$['pricebook-id'] = newPricebookID;
});

xml.collect('amount'); // We may have more than one amount for various quantities
xml.on('updateElement: price-table', priceInfo => {
    if (priceInfo.amount && priceInfo.amount.length > 0) {
        priceInfo.amount.forEach(amountObj => {
            const oldPrice = parseFloat(amountObj.$text);
            const newPrice = convertPrice(oldPrice, exchangeRate);
            amountObj.$text = newPrice.toString();
        });
    }
    if (priceInfo['price-info']) {
        const prices = JSON.parse(priceInfo['price-info']);
        Object.keys(prices).forEach(date => {
            const oldPrice = prices[date];
            const newPrice = convertPrice(oldPrice, exchangeRate);
            prices[date] = newPrice;
        });
        priceInfo['price-info'] = JSON.stringify(prices);
    }
});

xml.on('data', data => {
    fixIndentation(data);
    data = data.replaceAll('&quot;', '"'); // Fix the wrong escaping used in the xml-stream module
    outputStream.write(data);
});

xml.on('end', () => {
    outputStream.end(() => {
        // Validate the generated XML
        const xmlContent = fs.readFileSync(output, ENCODING_UTF8);
        const xsdContent = fs.readFileSync(xsd, ENCODING_UTF8);
        const xmlDoc = libxmljs.parseXml(xmlContent);
        const xsdDoc = libxmljs.parseXml(xsdContent);
        const isValid = xmlDoc.validate(xsdDoc);

        if (isValid) {
            console.log('Updated XML saved to', output, 'and is valid.');
        } else {
            console.error('Updated XML saved to', output, 'but is invalid:', xmlDoc.validationErrors);
        }
    });
});

xml.on('error', (err) => {
    console.error('Error processing the XML:', err);
});

/**
 * Converts a price from the old currency to the new currency using rounding rules.
 *
 * @param {number} price - The original price.
 * @param {number} exchangeRate - The exchange rate between the old and new currencies.
 * @returns {number} - The converted price, rounded to the nearest 4 or 9.
 *
 * @example
 * convertPrice(100.50, 5.03); // Returns 504
 * convertPrice(200.75, 4.98); // Returns 999
 */
function convertPrice(price, exchangeRate) {
    const roundedToNearest5 = Math.ceil(price * exchangeRate / 5) * 5; // Ends in 5 or 0
    const roundedPrice = roundedToNearest5 - 1; // Ends in 4 or 9
    return roundedPrice;
}

/**
 * Fixes the indentation in the XML output based on specific tags.
 * For some reason, xml-stream can't keep the original indentation.
 *
 * @param {string} data - The XML tag to check for indentation.
 * @returns {void}
 */
function fixIndentation(data) {
    if (data === '</header>') {
        indentBy(2);
    }
    const headerTags = ['<currency', '<display-name', '<online-flag', '<parent'];
    if (headerTags.indexOf(data) !== -1) {
        indentBy(3);
    }
    if (data === '</price-table>') {
        indentBy(3);
    }
    const priceTableTags = ['<amount', '<price-info'];
    if (priceTableTags.indexOf(data) !== -1) {
        indentBy(4);
    }
}

/**
 * Indents the output stream by the specified number of indentations.
 *
 * @param {number} numberOfIndentations - The number of indentations to add.
 * @returns {void}
 */
function indentBy(numberOfIndentations) {
    outputStream.write('\n' + '    '.repeat(numberOfIndentations));
}

/**
 * Validates the currency code according to ISO 4217 standard.
 *
 * @param {string} value - The currency code to validate.
 * @returns {string} - The validated currency code in uppercase.
 * @throws {commander.InvalidArgumentError} - Throws an error if the currency code is invalid.
 *
 * @example
 * validateCurrencyCode('usd'); // Returns 'USD'
 * validateCurrencyCode('eur'); // Returns 'EUR'
 * validateCurrencyCode('abc'); // Throws an error with message 'Invalid currency code.'
 */
function validateCurrencyCode(value) {
    const currencyCode = value.toUpperCase();
    const regex = /^[A-Z]{3}$/g;
    if (!currencyCode.match(regex)) {
      throw new commander.InvalidArgumentError('Invalid currency code.');
    }
    return currencyCode;
}
