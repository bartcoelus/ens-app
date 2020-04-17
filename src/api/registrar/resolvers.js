import crypto from 'crypto'
import { isShortName } from '../../utils/utils'

import getENS, { getRegistrar } from 'api/ens'

import modeNames from '../modes'
import { sendHelper } from '../resolverUtils'

const defaults = {}
const secrets = {}

function randomSecret() {
  return '0x' + crypto.randomBytes(32).toString('hex')
}

const resolvers = {
  Query: {
    async getRentPrice(_, { name, duration, tld }, { cache }) {
      const registrar = getRegistrar()
      return registrar.getRentPrice(name, duration, tld)
    },
    async getMinimumCommitmentAge(_, { tld }) {
      //console.log("yolo getMinimumCommitmentAge", tld)
      try {
        const registrar = getRegistrar()
        console.log(registrar)
        const minCommitmentAge = await registrar.getMinimumCommitmentAge(tld)
        return parseInt(minCommitmentAge)
      } catch (e) {
        console.log(e)
      }
    }
  },
  Mutation: {
    async commit(_, { label, tld }, { cache }) {
      const registrar = getRegistrar()
      //Generate secret
      //console.log("yolo commit", label, tld)
      const secret = randomSecret()
      secrets[label] = secret
      const tx = await registrar.commit(label, secret, tld)
      return sendHelper(tx)
    },
    async register(_, { label, duration, tld }) {
      //console.log("yolo register", { label, duration, tld })
      const registrar = getRegistrar()
      const secret = secrets[label]
      const tx = await registrar.register(label, duration, secret, tld)

      return sendHelper(tx)
    },
    async reclaim(_, { name, address, tld }) {
      //console.log("yolo reclaim", name, address, tld)
      const registrar = getRegistrar()
      const tx = await registrar.reclaim(name, address, tld)
      return sendHelper(tx)
    },
    async renew(_, { label, duration, tld }) {
      //console.log("yolo renew", label, duration, tld)
      const registrar = getRegistrar()
      const tx = await registrar.renew(label, duration, tld)
      return sendHelper(tx)
    },
    async getDomainAvailability(_, { name, tld }, { cache }) {
      //console.log("yolo getDomainAvailability", name, tld)
      const registrar = getRegistrar()
      const ens = getENS()
      try {
        const {
          state,
          registrationDate,
          revealDate,
          value,
          highestBid
        } = await registrar.getEntry(name, tld)
        let owner = null
        if (isShortName(name)) {
          cache.writeData({
            data: defaults
          })
          return null
        }

        if (modeNames[state] === 'Owned') {
          //owner = await getOwner(`${name}.eth`)
          owner = await ens.getOwner(`${name}.${tld}`)
        }

        const data = {
          domainState: {
            //name: `${name}.eth`,
            name: `${name}.${tld}`,
            state: modeNames[state],
            registrationDate,
            revealDate,
            value,
            highestBid,
            owner,
            __typename: 'DomainState'
          }
        }

        cache.writeData({ data })

        return data.domainState
      } catch (e) {
        console.log('Error in getDomainAvailability', e)
      }
    },
    async setRegistrant(_, { name, address, tld }) {
      //console.log("yolo setregistrant", name, address, tld)
      const registrar = getRegistrar()
      const tx = await registrar.transferOwner(name, address, tld)
      return sendHelper(tx)
    },
    async releaseDeed(_, { label, tld }) {
      //console.log("yolo releasedeed", label, tld)
      const registrar = getRegistrar()
      const tx = await registrar.releaseDeed(label, tld)
      return sendHelper(tx)
    },
    async submitProof(_, { name, parentOwner }) {
      const registrar = getRegistrar()
      const tx = await registrar.submitProof(name, parentOwner)
      return sendHelper(tx)
    }
  }
}

export default resolvers

export { defaults }
