# Dataportal

NOTE: These are some semi-random thoughts on what Dataportal could be used for, and how it might work.

Transfer data differences efficiently.

## Scenario: search site

A "search" site (can be anything) where results often return the same or quite similar results for a given search set.

### Concept 1: multi-level cache expiry.

For a given cache set we can have multiple levels of expiry, for example: an expiry where we should not show the data at all, an expiry where we can show a summary of the data, and an expriy for the details of the data. ie: we have the following classifications: "expired", "it's still good" and "fresh as".
So the concept is that we can define cache expiration by more than just time - for example the number of available items for each result might be a factor as it would be unusual for an item to be sold out super quickly.

#### Implementation example

Say we are running the hottest shoe-selling boutique on the internet, and our data result for a given search query contains 10kb of data per shoe, including the details of the shoes, urls for images, diffrent sizes and costs, etc, etc, and we reurn 24 shoes for a standard query, which means about 240kb. We need 6 queries for each shoe to build the complete result set - each query takes and average of 15ms, so a complete query for all 24 shoes averages 2,160ms.

We have a cached JSON payload of the previous query result (assuming the same parameters).
On initial page load if the data is:

* Less than 30 minutes old and
* Each item in the set has at a quanitity available of at least 2 sets of shoes

We consider it "it's still good", so this JSON payload is shown to the user as an outline of the results.

At the same time we check the 2nd cache level, which is defined as less than 10 minutes old, and a quantity of at least 4 for each result. If the 1st level passes, but the 2nd level fails, we simply query the database again, and can then return a delta object that can be used to patch the 2nd level object differences.

#### Benefits

* You can display something useful to the user imediately, and the likelyhood of the data being relevant is high.
* You can update the result-set on the go, as the latest data comes in.
* You can optimise the database queries based on the object diff, and only retreive relevant data.

The main benefit: you get much more granular control over what data is relevant at any given point in time. In our example, you might only need to update 2 sets of shoe queries, making the DB access 180ms, and the amount of data to transfer about 20kb, compared to 2,160ms and 240kb.

## Actual implementation

We could setup a service that is mainly client based, with a proxy for the server, eg:

```sequencediagram
title data portal

note over Client: Checks expiration rules\n on current cached dataset.

Client->Proxy: Query for expired data

note over Proxy: Checks to see if\nwe have already cached\nthe expired data

Proxy->Server: Query for expired data
Server->Proxy: result set

note over Proxy: Merge object, set\n new cache version
Proxy->Client: Object diff
```

The client knows what it means to have an expired dataset, and can apply the rules to the JSON object, and make a query when needed.

Alternatively the rules engine could live on either the client or the proxy - the benefit of it being part of the proxy is that it keeps the frontend simpler - and the user can concentrate on where the data goes.

