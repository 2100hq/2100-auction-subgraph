import { Address,log,BigInt, json,EthereumBlock } from "@graphprotocol/graph-ts"
import { Contract, Create } from "../generated/Contract/Contract"
import {  Registry, AuctionManager, Auction, AuctionBalance, TokenBalance } from "../generated/schema"

import {
  ClaimTokensCall,
  Bid, 
  Transfer,
  Start,
  AuctionContract,
  AuctionContract__getAuctionResult
} from "../generated/templates/AuctionContract/AuctionContract"

import {AuctionContract as AuctionTemplate} from "../generated/templates"


function updateAuctionState(auction:Auction,state:AuctionContract__getAuctionResult): Auction{
  auction.auctionId = state.value0
  // auction.auctionId = 0
  auction.isActive = state.value1
  auction.isStopReached = state.value2
  auction.startTime = state.value3
  auction.endTime = state.value4
  auction.secondsPassed = state.value5
  auction.secondsRemaining = state.value6
  auction.currentPrice = state.value7
  auction.finalPrice = state.value8
  auction.deposits = state.value9
  return auction
}

export function handleStart(event: Start): void {

  let contract = AuctionContract.bind(event.address)

  let name = contract.name()

  let auctionState = contract.getAuction(event.params.auctionId)

  let auction = new Auction(name + "!" + BigInt.fromI32(event.params.auctionId).toString())

  auction.address = event.address.toHex()
  auction.name = name

  auction = updateAuctionState(auction,auctionState)
  // auction = updateAuctionStateFromContract(auction,event.params.auctionId,contract)

  auction.save()
}

export function handleBid(event: Bid): void {
  let contract = AuctionContract.bind(event.address)
  let name = contract.name()

  let auctionId  = BigInt.fromI32(event.params.auctionId).toString()

  let auction = new Auction(name + "!" + auctionId)

  let auctionBalanceId = event.params.sender.toHex() + "!" + name + "!" + auctionId
  let auctionBalance = AuctionBalance.load(auctionBalanceId)

  if(auctionBalance == null){
    auctionBalance = new AuctionBalance(auctionBalanceId)
    auctionBalance.address = event.params.sender.toHex()
    auctionBalance.bids = BigInt.fromI32(0)
    auctionBalance.available = BigInt.fromI32(0)
    auctionBalance.auctionName = name
    auctionBalance.auctionId = event.params.auctionId
  }
  auctionBalance.bids = auctionBalance.bids + event.params.amount
  auctionBalance.save()
}

export function handleTransfer(event: Transfer) : void {
  let contract = AuctionContract.bind(event.address)
  let name = contract.name()

  let tokenBalanceToId = event.params._to.toHex() + "!" + name 
  let tokenBalanceTo = TokenBalance.load(tokenBalanceToId)

  if(tokenBalanceTo == null){
    tokenBalanceTo = new TokenBalance(tokenBalanceToId)
    tokenBalanceTo.balance = BigInt.fromI32(0)
    tokenBalanceTo.tokenName = name
    tokenBalanceTo.address = event.params._to.toHex()
  }

  tokenBalanceTo.balance = tokenBalanceTo.balance + event.params._value
  tokenBalanceTo.save()

  let tokenBalanceFromId = event.params._from.toHex() + "!" + name 
  let tokenBalanceFrom = TokenBalance.load(tokenBalanceFromId)

  if(tokenBalanceFrom == null){
    tokenBalanceFrom = new TokenBalance(tokenBalanceFromId)
    tokenBalanceFrom.balance = BigInt.fromI32(0)
    tokenBalanceFrom.tokenName = name
    tokenBalanceFrom.address = event.params._to.toHex()
  }

  tokenBalanceFrom.balance = tokenBalanceFrom.balance - event.params._value
  tokenBalanceFrom.save()
}

export function handleClaimTokens(call: ClaimTokensCall) :void {
  let contract = AuctionContract.bind(call.to)
  let auctionId = call.inputs._auctionId
  let mybid = contract.getBid(auctionId,call.from)
  let currentPrice = contract.calcCurrentPrice(auctionId)
  let name = contract.name()

  let tokenBalanceId = call.from.toHex() + "!" + name 
  let tokenBalance = TokenBalance.load(tokenBalanceId)

  if(tokenBalance == null){
    tokenBalance = new TokenBalance(tokenBalanceId)
    tokenBalance.balance = BigInt.fromI32(0)
    tokenBalance.tokenName = name
    tokenBalance.address = call.from.toHex()
  }
  tokenBalance.balance = tokenBalance.balance + mybid / currentPrice
  tokenBalance.save()

  let auctionBalanceId = call.from.toHex() + "!" + name + "!" + BigInt.fromI32(auctionId).toString()
  let auctionBalance = AuctionBalance.load(auctionBalanceId)

  if(auctionBalance == null){
    auctionBalance = new AuctionBalance(auctionBalanceId)
    auctionBalance.address = call.from.toHex()
    auctionBalance.bids = mybid
    auctionBalance.available = BigInt.fromI32(0)
    auctionBalance.auctionName = name
    auctionBalance.auctionId = auctionId
  }

  auctionBalance.available = BigInt.fromI32(0)
  auctionBalance.save()

}

export function handleBlock(block: EthereumBlock): void{
}

export function handleCreate(event: Create): void {
  let reg = Registry.load(event.address.toHex())

  if (reg == null) {
    reg = new Registry(event.address.toHex())
    reg.length = BigInt.fromI32(0)
    reg.strings = new Array<string>()
  }

  reg.length = reg.length + BigInt.fromI32(1)

  let strings = reg.strings
  strings.push(event.params._string)
  reg.strings = strings

  reg.save()

  AuctionTemplate.create(event.params._address)

  let auctionManager = new AuctionManager(event.params._string)

  auctionManager.address = event.params._address.toHex()
  auctionManager.name = event.params._string
  auctionManager.currentIndex = 0
  auctionManager.save()

  let contract = AuctionContract.bind(event.params._address)
  let auction = new Auction(auctionManager.name + "!0")

  let auctionState = contract.getAuction(0)

  auction.name = auctionManager.name
  auction.address = auctionManager.address

  auction = updateAuctionState(auction,auctionState)
  // auction = updateAuctionStateFromContract(auction,0,contract)

  auction.save()


}

//export function handleCreate(event: Create): void {
//  // Entities can be loaded from the store using a string ID; this ID
//  // needs to be unique across all entities of the same type
//  let entity = ExampleEntity.load(event.transaction.from.toHex())

//  // Entities only exist after they have been saved to the store;
//  // `null` checks allow to create entities on demand
//  if (entity == null) {
//    entity = new ExampleEntity(event.transaction.from.toHex())

//    // Entity fields can be set using simple assignments
//    entity.count = BigInt.fromI32(0)
//  }

//  // BigInt and BigDecimal math are supported
//  entity.count = entity.count + BigInt.fromI32(1)

//  // Entity fields can be set based on event parameters
//  entity._string = event.params._string
//  entity._address = event.params._address

//  // Entities can be written to the store with `.save()`
//  entity.save()

//  // Note: If a handler doesn't require existing field values, it is faster
//  // _not_ to load the entity from the store. Instead, create it fresh with
//  // `new Entity(...)`, set the fields that should be updated and save the
//  // entity back to the store. Fields that were not set or unset remain
//  // unchanged, allowing for partial updates to be applied.

//  // It is also possible to access smart contracts from mappings. For
//  // example, the contract that has emitted the event can be connected to
//  // with:
//  //
//  // let contract = Contract.bind(event.address)
//  //
//  // The following functions can then be called on this contract to access
//  // state variables and other data:
//  //
//  // - contract.name(...)
//  // - contract.stringToAddress(...)
//  // - contract.stringsLength(...)
//  // - contract.version(...)
//  // - contract.addressToString(...)
//  // - contract.strings(...)
//  // - contract.owner(...)
//  // - contract.create(...)
//}
