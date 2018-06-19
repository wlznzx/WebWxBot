const WxModule = require("./wx_module");
const readline = require('readline');

let mWxModule = new WxModule();

let curMsg;

mWxModule.on('friend', (msg) => {
	if(msg.Content && msg.Content != ''){
    curMsg = msg;
		console.log(`
        新消息
        ${msg.Member.RemarkName || msg.Member.NickName}: ${msg.Content}
      `);
    // rl.question('回复 ' + msg.Member.NickName + ':', (answer) => {
    //   // TODO: Log the answer in a database
    //   // console.log(`Thank you for your valuable feedback: ${answer}`);
    //   mWxModule.sendText(msg.FromUserName, answer);
    //   // rl.close();
    // });
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  // console.log(`接收到：${input}`);
  if(curMsg){
    console.log(`回复${curMsg.Member.NickName}：${input}`);
    mWxModule.sendText(curMsg.FromUserName, input);
  }
});




