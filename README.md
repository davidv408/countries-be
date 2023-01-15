# countries-be

node index.js
Open http://localhost:3001 to view it in the browser.

# Continent NoSQL Data Model
{
  name: {
    common: string,
    official: string,
  }
  continentCode: string,
  languages: Array<string>,
  flag: string,
  population: number,
  timezones: Array<string>,
  countries: Array<cca3ID: string>,
}
