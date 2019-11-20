import { Address,log,BigInt, json,EthereumBlock } from "@graphprotocol/graph-ts"
import { Contract, Create } from "../generated/Contract/Contract"
import { ExampleEntity, Registry } from "../generated/schema"

// export function handleBlockWithCallToContract(block: EthereumBlock):void{
//   log.info('contract call',[block.hash.toString()])
// }

export function handleBlock(block: EthereumBlock):void{
  log.info('new block',[block.hash.toHexString()])

  let reg = Registry.load('Registry')

  if (reg == null) {
    reg = new Registry('Registry')
  }

  reg.length = BigInt.fromI32(0)
  // let contract = Contract.bind(Address.fromString('0'))
  // reg.length = contract.stringsLength()

  // for(let i=BigInt.fromI32(0); i < reg.length; i = i.plus(BigInt.fromI32(1))){
  //   reg.strings.push(contract.strings(i))
  // }

  reg.save()

  let entity = ExampleEntity.load(block.hash.toHex())
  
  if (entity == null) {
    entity = new ExampleEntity(block.hash.toHex())
  }
  entity.count = BigInt.fromI32(1)
  entity.save()
}

export function handleCreate(event: Create): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from.toHex())

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (entity == null) {
    entity = new ExampleEntity(event.transaction.from.toHex())

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity._string = event.params._string
  entity._address = event.params._address

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.name(...)
  // - contract.stringToAddress(...)
  // - contract.stringsLength(...)
  // - contract.version(...)
  // - contract.addressToString(...)
  // - contract.strings(...)
  // - contract.owner(...)
  // - contract.create(...)
}
