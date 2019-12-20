# 2100 Auction Subgraph
Graph Protocol subgraph for parsing auction and registry events from blockchain and producing graphql data.


## Usage
This document is aimed towards 2 types of users. If you are a developer you are interested in the installation
development and running of the graphql server.

If you are a user interested in consuming the data then skip down to the [API](#API) Section.

## Installation
Install [graph protocol](https://thegraph.com/docs/quick-start).

Clone the repo.

Find the registry contract address, currently : `0xa623Ddf7b1D79baADE582F9a4558a430E6fe9395`

Inside the repo you can initalize your sugraph

`graph init --from-contract 0xa623Ddf7b1D79baADE582F9a4558a430E6fe9395 --network kovan --abi abi/registry.json citize
nhex/2100-auction-registry`

## Updating Code
The main files to update are
- **subgraph.yaml** - Like a package.json file for graphprotocol. Wire up all all your callbacks which you defined in mapping.js
- **src/mapping.ts** - Assemblyscript file (similar to typescript) which defines the logic of parsing block events and saving them to your data store.
- **schema.graphql** - Defines the graphql schemas available to the consumer api.
- **abis/** - Contains the abis for both 2100 registry and auction contracts.

There are npm scripts set up for conveinence.
- `yarn codegen` - any time you change your schemas, abis, run this.
- `yarn build` - When you update mapping.ts file, run this to compile and check code.
- `TOKEN=mytoken yarn deploy` - When you want to upload your code to thegraph.com. Requires TOKEN env to be set.
- `PRIVATE=privateurl yarn deploy-private` - When you want to upload your code to your private graph protocol node. Requires PRIVATE node url env to be set.
- `yarn deploy-local` - When you want to upload your code to a graph protocol node running on localhost.


## API
The API for accessing data is done through graphql compatible clients such as [Apollo](https://www.apollographql.com/docs/react/).

### Schemas
These schemas are subject to change, but you can discover them through the graphql endpoint or the
exposed graphql UI when running a node locally. 

`http://localhost:8000/subgraphs/name/citizenhex/2100-auction-registry/graphql`

You can also view the `schema.graphql` file.




