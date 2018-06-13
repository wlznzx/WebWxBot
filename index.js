const WxModule = require("./wx_module");
const readline = require('readline');

let mWxModule = new WxModule();


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.question('What do you think of Node.js? ', (answer) => {
  // TODO: Log the answer in a database
  console.log(`Thank you for your valuable feedback: ${answer}`);
  rl.close();
});


mWxModule.on('friend', (msg) => {
	if(msg.Content && msg.Content != ''){
		console.log(`
        新消息
        ${msg.Member.RemarkName || msg.Member.NickName}: ${msg.Content}
      `);
	}
});

mWxModule.on('group', (msg) => {
  console.log(`
        来自群 ${msg.Group.NickName} 的消息
        ${msg.GroupMember.DisplayName || msg.GroupMember.NickName}: ${msg.Content}
        `);
  // bot.sendText(msg.FromUserName, 'Got it');
});

mWxModule.doRun();

