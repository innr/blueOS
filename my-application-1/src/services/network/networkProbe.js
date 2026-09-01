export function createNetworkProbe(network) {
  let listener = null
  return {
    getType(callback) {
      try {
        network.getType({ success: (result) => callback(result && result.type || 'none'), fail: () => callback('none') })
      } catch (error) {
        callback('none')
      }
    },
    subscribe(callback) {
      listener = (result) => callback(result && result.type || 'none')
      try {
        network.subscribe({ reserved: true, callback: listener, fail: () => callback('none') })
      } catch (error) {
        callback('none')
      }
    },
    unsubscribe() {
      listener = null
      try { network.unsubscribe() } catch (error) {}
    }
  }
}
