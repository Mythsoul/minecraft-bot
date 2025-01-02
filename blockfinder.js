bot.on('chat', async (username, message) => {
    if (username === bot.username) return
  
    if (message === 'loaded') {
      console.log(bot.entity.position)
      await bot.waitForChunksToLoad()
      bot.chat('Ready!')
    }
  
    if (message.startsWith('find')) {
      const name = message.split(' ')[1]
      if (bot.registry.blocksByName[name] === undefined) {
        bot.chat(`${name} is not a block name`)
        return
      }
      const ids = [bot.registry.blocksByName[name].id]
  
      const startTime = performance.now()
      const blocks = bot.findBlocks({ matching: ids, maxDistance: 128, count: 10 })
      const time = (performance.now() - startTime).toFixed(2)
  
      bot.chat(`I found ${blocks.length} ${name} blocks in ${time} ms`)
    }
  })
  

  export default bot; 