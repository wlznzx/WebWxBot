const WxModule = require("./wx_module");


let mWxModule = new WxModule();

mWxModule.on('friend', (msg) => {
  console.log(`
        新消息
        ${msg.Member.RemarkName || msg.Member.NickName}: ${msg.Content}
      `);
  // bot.sendText(msg.FromUserName, 'Got it');
});

mWxModule.on('group', (msg) => {
  console.log(`
        来自群 ${msg.Group.NickName} 的消息
        ${msg.GroupMember.DisplayName || msg.GroupMember.NickName}: ${msg.Content}
        `);
  // bot.sendText(msg.FromUserName, 'Got it');
});

mWxModule.run();

