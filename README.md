# SFCC: Pricebook Currency Update

This project offers a script to stream an XML file, convert all prices from one currency to another, and validate the resulting XML against an XSD schema.

## Prerequisites

- Node.js
- npm

## Installation

1. Clone the repository:
   ```sh
   git clone git@github.com:enis-ismail/sfcc-pricebook-currency-update.git
   cd sfcc-pricebook-currency-update
   ```

2. Install the required npm packages:
   ```sh
   npm install
   ```

## Usage

To run the script, use the following command:

```sh
node index.js -i <input-xml-file> -o <output-xml-file> -c <currency-code> -r <exchange-rate>
```

### Options

- `-i, --input <path>`: Input XML file path (required)
- `-o, --output <path>`: Output XML file path (required)
- `-c, --currency <string>`: The currency to convert the prices to (required)
- `-r, --exchangeRate <number>`: Exchange rate between the old and new currencies (required)
- `-x, --xsd <path>`: XSD file path for validation (optional, defaults to `pricebook.xsd`)

### Example

```sh
node index.js -i prices-EUR.xml -o prices-RON.xml -c RON -r 5.03 -x pricebook.xsd
```

This command will:

1. Read the `prices-EUR.xml` file.
2. Replace the currency code and pricebook ID with the new ones.
3. Convert the prices and write the new data to `prices-RON.xml`.
4. Validate the `prices-RON.xml` file against `pricebook.xsd`.

## Validation

The script uses the `libxmljs` library to validate the generated XML file against the provided XSD schema. If the XML is valid, a success message is logged. If invalid, the validation errors are logged.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.