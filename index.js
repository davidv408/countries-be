const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const NodeCache = require("node-cache");
const e = require("express");

const app = express();
const port = 3001;
const nodeCache = new NodeCache();

const corsOptions = {
  origin: "http://localhost:3000",
  optionsSuccessStatus: 200,
};

const NodeCacheKey = {
  ALL_COUNTRIES: "ALL_COUNTRIES",
};

app.get("/countries", cors(corsOptions), (_, res) => {
  // Cache Hit.
  const allCountriesCache = nodeCache.get(NodeCacheKey.ALL_COUNTRIES);
  if (allCountriesCache !== undefined) {
    console.log(`${Date.now()} /countries/ Cache Hit`);
    res.status(200).json(getAllCountriesOverview(allCountriesCache));
    return;
  }

  // Refresh the Cache.
  (async () => {
    try {
      const allCountries = await getAllCountries();

      // Cache for 3 days.
      const success = nodeCache.set(
        NodeCacheKey.ALL_COUNTRIES,
        allCountries,
        259200
      );

      if (success) {
        res.status(200).json(getAllCountriesOverview(allCountries));
      } else {
        throw new Error("Could not update the Cache for /countries/");
      }
    } catch (err) {
      res.status(500).json({ msg: e.message });
    }
  })();
});

app.get("/countries/:id", cors(corsOptions), (req, res) => {
  (async () => {
    try {
      const countryID = req.params.id;
      // Check if the requested Country ID is in the Cache.
      let allCountriesCache = nodeCache.get(NodeCacheKey.ALL_COUNTRIES);
      let individualCountry = (allCountriesCache ?? []).find(
        (country) => country.id === countryID
      );

      // If the requested Country ID is in the Cache, return the Country.
      if (individualCountry !== undefined) {
        console.log(`${Date.now()} /countries/ Cache Hit from /countries/:id`);
        res.status(200).json(individualCountry);
        return;
      }

      // If the Country ID is not in cache, refresh the Cache.
      const allCountries = await getAllCountries();
      // Cache for 3 days.
      const success = nodeCache.set(
        NodeCacheKey.ALL_COUNTRIES,
        allCountries,
        259200
      );

      // Check the Cache now for the Country ID
      allCountriesCache = nodeCache.get(NodeCacheKey.ALL_COUNTRIES);
      individualCountry = (allCountriesCache ?? []).find(
        (country) => country.id === countryID
      );
      if (individualCountry !== undefined) {
        console.log(
          `${Date.now()} /countries/ Refreshed Cache Hit from /countries/:id`
        );
        res.status(200).json(individualCountry);
        return;
      } else if (!success) {
        throw new Error(
          `Could not update the Cache for /countries/${countryID}`
        );
      } else {
        // User is trying to access a Country ID that is not supported
        throw new Error(`Country Code ${countryID} is not supported.`);
      }
    } catch (e) {
      res.status(500).json({ msg: e.message });
    }
  })();
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

async function getAllCountries() {
  const response = await fetch("https://restcountries.com/v3.1/all");
  const data = await response.json();

  const cca3ToName = new Map(data.map((e) => [e.cca3, e.name.common]));

  return data.map(
    ({
      cca3,
      name,
      population,
      region,
      subRegion,
      capital,
      currencies,
      languages,
      tld,
      flags,
      borders,
    }) => ({
      id: cca3,
      name: name.common,
      // "Anartica" does not have a nativeName
      nativeName: name?.nativeName
        ? name.nativeName[Object.keys(name.nativeName)[0]].official
        : null,
      population: population,
      region: region,
      // ["South Georgia and the South Sandwich Islands",
      //  "Territory of the French Southern and Antarctic Lands",
      //  "Heard Island and McDonald Islands", "Antarctica", "Bouvet Island"]
      //  are not associated with a subRegion.
      subRegion: subRegion ?? null,
      // ["Heard Island and McDonald Islands",
      //  "Macao Special Administrative Region of the People's Republic of China",
      //  "Antarctica", "Bouvet Island"] are not associated with a capital.
      capital: capital ?? null,
      currencies: currencies
        ? Object.values(currencies).map((e) => e.name)
        : null,
      // "Anartica" does not have languages.
      languages: languages ? Object.values(languages) : null,
      // "Republic of Kosovo" does not have a tld.
      topLevelDomain: tld ?? null,
      imageURL: flags.svg,
      // Many countries do not have border countries.
      borderCountries: borders
        ? borders.map((cca3) => ({ id: cca3, name: cca3ToName.get(cca3) }))
        : null,
    })
  );
}

function getAllCountriesOverview(allCountries) {
  return allCountries.map(
    ({ id, name, population, region, capital, imageURL }) => ({
      id,
      name,
      population,
      region,
      capital,
      imageURL,
    })
  );
}
