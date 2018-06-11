const NeDB = require('nedb');


class WxDao{

	constructor(options = {}) {
    	super();
    	initDB();
  	}

	initDB(){
		// member store
	    this.Members = new NeDB('./member.db');
	    this.Contacts = new NeDB();
	    this.Groups = new NeDB();
	    this.GroupMembers = new NeDB();
	    this.Brands = new NeDB(); // 公众帐号
	    this.SPs = new NeDB(); // 特殊帐号
	    // indexing
	    this.Members.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.Contacts.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.Groups.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.Brands.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.SPs.ensureIndex({ fieldName: 'UserName', unique: true });
	}

	async getMember(id) {
    const member = await this.Members.findOneAsync({ UserName: id });

    return member;
  }

  async getGroup(groupId) {
    let group = await this.Groups.findOneAsync({ UserName: groupId });

    if (group) return group;

    try {
      await this.fetchBatchgetContact([groupId]);
    } catch (e) {
      console.log('fetchBatchgetContact error', e);
      return null;
    }

    group = await this.Groups.findOneAsync({ UserName: groupId });

    return group;
  }

  async getGroupMember(id, groupId) {
    let member = await this.GroupMembers.findOneAsync({
      UserName: id,
      GroupUserName: groupId,
    });

    if (member) return member;

    try {
      await this.fetchBatchgetContact([groupId]);
    } catch (e) {
      console.log('fetchBatchgetContact error', e);
      return null;
    }

    member = await this.GroupMembers.findOneAsync({ UserName: id });

    return member;
  }
	
}