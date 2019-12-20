import { Address,log,BigInt, json,EthereumBlock } from "@graphprotocol/graph-ts"
import { Contract, Create } from "../generated/Contract/Contract"
import {  Registry, AuctionManager, Auction, Bid, Balance, Stat} from "../generated/schema"

import {
  Bid as BidEvent, 
  BidDonate,
  BidBurn,
  Transfer,
  StartAuction,
  Claim,
  AuctionContract,
  AuctionContract__getAuctionResult
} from "../generated/templates/AuctionContract/AuctionContract"

import {AuctionContract as AuctionTemplate} from "../generated/templates"


function updateAuctionState(auction:Auction,state:AuctionContract__getAuctionResult): Auction{
  auction.auctionId = state.value0
  // auction.auctionId = 0
  auction.isActive = state.value1
  auction.startTime = state.value2
  auction.endTime = state.value3
  auction.secondsPassed = state.value4
  auction.secondsRemaining = state.value5
  auction.deposits = state.value6
  return auction
}

function getName(name:string): string{
  return name.split(".")[0]
}

export function handleStart(event: StartAuction): void {

  let contract = AuctionContract.bind(event.address)

  let name = getName(contract.name())

  let auctionState = contract.getAuction(event.params.auctionId)

  let auction = new Auction(name + "!" + event.params.auctionId.toString())

  auction.address = event.address.toHex()
  auction.name = name
  auction.bidids = new Array<string>()

  auction = updateAuctionState(auction,auctionState)


  let auctionManager = AuctionManager.load(name)

  auctionManager.currentAuctionId = contract.currentAuctionId()

  auction.amount = auctionManager.amount
  auction.duration = auctionManager.duration

  auction.save()
  auctionManager.save()
}

export function handleBid(event: BidEvent): void {
  let contract = AuctionContract.bind(event.address)
  let name = getName(contract.name())

  let auctionId  = event.params.auctionId.toString()

  let auction = Auction.load(name + "!" + auctionId) as Auction
  auction = updateAuctionState(auction as Auction,contract.getAuction(event.params.auctionId))

  // if(auction == null){
  //   auction = new Auction(name + "!" + auctionId)
  //   auction.bidids = new Array<string>()
  // }

  let bidId = event.params.sender.toHex() + "!" + name + "!" + auctionId
  let bid = Bid.load(bidId)

  let bidids = auction.bidids

  if(bid == null){
    bid = new Bid(bidId)
    bid.address = event.params.sender.toHex()
    bid.amount = BigInt.fromI32(0)
    bid.claim = BigInt.fromI32(0)
    bid.name = name
    bid.auctionId = event.params.auctionId
    bid.tokenAddress = event.address.toHex()

    //new bid requires pushing into auction array
    bidids.push(bid.id)
    auction.bidids = bidids
  }

  bid.amount = bid.amount + event.params.amount
  bid.save()
  auction.save()

  for (let i = 0; i < bidids.length; ++i){
    let bid = Bid.load(bidids[i]) as Bid
    // log.warning('new bid',[auction.amount.toString(),bid.amount.toString(),auction.deposits.toString()])
    bid.claim = (auction.amount * bid.amount) / auction.deposits
    // log.warning('claim',[bid.claim.toString()])
    bid.save()

  }

}

function loadBalance(address:Address,name:string,tokenAddress:Address):Balance{
  let id = address.toHex() + "!" + name 
  let balance = Balance.load(id)

  if(balance == null){
    balance = new Balance(id)
    balance.balance = BigInt.fromI32(0)
    balance.name = name
    balance.address = address.toHex()
    balance.tokenAddress = address.toHex()
  }

  return balance as Balance
}

export function handleTransfer(event: Transfer) : void {
  let contract = AuctionContract.bind(event.address)
  let name = getName(contract.name())

  let fromBalance = loadBalance(event.params._from,name,event.address)
  let toBalance = loadBalance(event.params._to,name,event.address)

  fromBalance.balance = fromBalance.balance - event.params._value
  toBalance.balance = toBalance.balance + event.params._value

  fromBalance.save()
  toBalance.save()
}

export function handleClaimTokens(event: Claim) :void {
  let contract = AuctionContract.bind(event.address)
  let auctionId = event.params.auctionId
  let name = getName(contract.name())

  let bidId = event.params._to.toHex() + "!" + name + "!" + auctionId.toString()
  let bid = Bid.load(bidId)
  // bid.amount = BigInt.fromI32(0)
  bid.claim = BigInt.fromI32(0)
  bid.save()

  let auction = new Auction(name + "!" + auctionId.toString())
  auction = updateAuctionState(auction,contract.getAuction(auctionId))
  auction.save()
}

let registryId = '0'
export function handleCreate(event: Create): void {
  let reg = Registry.load(registryId)

  if (reg == null) {
    reg = new Registry(registryId)
    reg.length = BigInt.fromI32(0)
    reg.strings = new Array<string>()
    reg.address = event.address.toHex()
    reg.name = '2100 Auction Registry'
  }

  reg.length = reg.length + BigInt.fromI32(1)

  let strings = reg.strings
  strings.push(event.params._string)
  reg.strings = strings

  reg.save()

  AuctionTemplate.create(event.params._address)

  let auctionContract = AuctionContract.bind(event.params._address)

  let auctionManager = new AuctionManager(event.params._string)

  auctionManager.address = event.params._address.toHex()
  auctionManager.name = getName(auctionContract.name())
  auctionManager.currentAuctionId = BigInt.fromI32(0)
  auctionManager.maximumSupply = auctionContract.MAXIMUM_SUPPLY()
  auctionManager.amount = auctionContract.AUCTION_AMOUNT()
  auctionManager.duration = auctionContract.AUCTION_DURATION()
  auctionManager.save()

  let auction = new Auction(auctionManager.name + "!0")

  let auctionState = auctionContract.getAuction(BigInt.fromI32(0))

  auction.bidids = new Array<string>()
  auction.name = auctionManager.name
  auction.address = auctionManager.address
  auction.amount = auctionManager.amount
  auction.duration = auctionManager.duration

  auction = updateAuctionState(auction,auctionState)
  // auction = updateAuctionStateFromContract(auction,0,contract)

  auction.save()


}

export function handleBurn(event:BidBurn):void{
  let stat = Stat.load('burned')
  if(stat == null){
    stat = new Stat('burned')
    stat.amount = BigInt.fromI32(0)
  }
  stat.amount = stat.amount + event.params._value
  stat.save()

}

export function handleDonate(event:BidDonate):void{
  let stat = Stat.load('donated')
  if(stat == null){
    stat = new Stat('donated')
    stat.amount = BigInt.fromI32(0)
  }
  stat.amount = stat.amount + event.params._value
  stat.save()

}
// based on blocks coming in. dont use.
function updateAuction(name:string, index:i32,array:Array<string>):void{
  let auctionManager = AuctionManager.load(name)


  let amContract = AuctionContract.bind(Address.fromString(auctionManager.address))

  let currentAuctionId = amContract.currentAuctionId()

  let auctionState = amContract.getAuction(currentAuctionId)

  let currentAuction = new Auction(name + "!" + currentAuctionId.toString())

  currentAuction = updateAuctionState(currentAuction,auctionState)

  currentAuction.save()

}

export function handleBlock(block: EthereumBlock): void{
  log.warning('handleblock',[block.number.toString()])
  let reg = Registry.load(registryId)
  if(reg == null) return
  reg.strings.forEach(updateAuction)


}


