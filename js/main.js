app = new Vue({
    el: '#app',
    data: {
        control: {
            currentNotification: null,
            notifications: [],
            notificationLock: false
        },
        eosValue:"",
        requiredFields: null,
        eos: null,
        account: null,
        user_eos_balance: 0,
        last_bet: null,
        bet_input: "1.0000",
        bet_result: null,
        old_bet_amount: null,
        old_credits: null,
        stoping: false,
        index: 0, //当前转动到哪个位置，起点位置
        count: 28, //总共有多少个位置
        speed: 20, //初始转动速度
        cycle: 20, //转动基本次数：即至少需要转动多少次再进入抽奖环节
        timer: 0, //setTimeout的ID，用clearTimeout清除
        result_timer: 0, // get_roll_result timeout.
        times: 0,
        prize: -1,      //中奖位置
        running: false, // 正在抽奖
        tpConnected: false,
        eop: 1, // 经营状况系数
        tpAccount: null
    },
    created: function () {},
    watch: {},
    methods: {
        resolveUrl: function (to) {
            if (typeof to === 'string')
                return to;
            if (to.name && !to.path)
                return to.name;
            if (!to.query)
                return to.path;
            var baseUrl = to.path + (to.path.indexOf('?') >= 0 ? '&' : '?');
            var args = [];
            for (var x in to.query) {
                args.push(x + '=' + encodeURIComponent(to.query[x]));
            }
            return baseUrl += args.join('&');
        },
        change_bet: function () {
            play_se("se_click");
            var new_bet = parseInt(prompt("赌多少？"));
            // Check new bet
            if (new_bet > 0) {
                this.bet_input = new Number(new_bet).toFixed(4);
            }
        },
        get_current_balance: function () {
            this.eos.getCurrencyBalance('eosio.token', this.account.name).then(x => {
                alert(x);
                this.user_eos_balance = x[0].split(' ', 1)[0];
        });
            this.get_current_eop();
        },
        get_current_eop: async function () {
            var happyeosslot_balance = await this.eos.getCurrencyBalance('eosio.token', 'happyeosslot');
            var happyeosslot_true_balance =
                await this.eos.getTableRows({
                    json: "true",
                    code: "happyeosslot",
                    scope: "happyeosslot",
                    limit: 10,
                    table: 'market'
                });
            happyeosslot_balance = happyeosslot_balance[0].split(' ', 1)[0];
            //this.eop = happyeosslot_true_balance;
            happyeosslot_true_balance = happyeosslot_true_balance.rows[0].deposit.balance.split(' ', 1)[0];
            this.eop = happyeosslot_balance / (happyeosslot_true_balance - 10000);
            //this.eop = new Number(this.eop).toFixed(4);
            return this.eop;
        },
        make_deposit: function (event) {
            play_se("se_click");
            if(isPc()){
                this.init_scatter();
            }else{
               this.init_tokenpocket();
            }
            var new_deposit = this.eosValue;//prompt("充值多少EOS？");

            // Check new deposit
            if (new_deposit > 0) {
                if (isPc()) {
                    this.deposit(new_deposit);
                } else {
                    if (this.tpConnected) {
                        this.tpDeposit(new_deposit);
                    } else {
                        this.notification('succeeded', '请下载TokenPocket或打开');
                    }

                }
            }else{
                this.notification('succeeded', '请输入EOS数额');
            }
        },
        make_withdraw: function (event) {
            play_se("se_click");
            if(isPc()){
                this.init_scatter();
            }else
            {
                this.init_tokenpocket();
            }
            var new_withdraw =this.eosValue;// prompt("提现多少EOS？");
            // Check new withdraw
            if (new_withdraw > 0) {
                this.withdraw(new_withdraw);
            }else{
                this.notification('succeeded', '出售多少HPY？');
            }
        },
        redirect: function (name, path, params, query) {
            if (name && !path)
                path = name;
            LazyRouting.RedirectTo(name, path, params, query);
        },
        get_roll_result: function () {
            this.eos.getTableRows({
                json: "true",
                code: "happyeosslot",
                scope: this.account.name,
                limit: 10,
                table: 'result'
            }).then((data) => {
                var result = data.rows[0].roll_number;
                this.bet_result = result;

                var rate_100 = 25;
                var rate_50 = new Array(11, 24);
                var rate_20 = new Array(6, 16, 21);
                var rate_10 = new Array(1, 10, 26);
                var rate_5 = new Array(3, 13, 18, 21);
                var rate_2 = new Array(2, 8, 17, 28);
                var rate_0_1 = new Array(5, 9, 12, 14, 19);
                var rate_0_0_1 = new Array(4, 7, 15, 20, 23, 27);

                if (this.running) {
                    var random = Math.random();
                     // console.log(random);
                    if (result >= 10000) {
                        this.stop_at(rate_100);
                    } else if (result >= 5000) {
                        this.stop_at(rate_50[Math.floor(random) * 2]);
                    } else if (result >= 2000) {
                        this.stop_at(rate_20[Math.floor(random * 3)]);
                    } else if (result >= 1000) {
                        this.stop_at(rate_10[Math.floor(random * 3)]);
                    } else if (result >= 500) {
                        this.stop_at(rate_5[Math.floor(random * 4)]);
                    } else if (result >= 200) {
                        this.stop_at(rate_2[Math.floor(random * 4)]);
                    } else if (result >= 10) {
                        this.stop_at(rate_0_1[Math.floor(random * 5)]);
                    } else if (result >= 1) {
                        this.stop_at(rate_0_0_1[Math.floor(random * 6)]);
                    } else {
                        this.result_timer = setTimeout(this.get_roll_result, 100); //循环调用
                    }
                }
            }).catch((err) => {
                alert(err.toString());
            })
        },
        tpGetRollResult: function () {
            tp.getTableRows({
                json: "true",
                code: "happyeosslot",
                scope: this.tpAccount.name,
                limit: 10,
                table: 'result'
            }).then((data) => {
                this.tpFlag="test5"
                this.user_info = data.data.rows.find(acc => acc.account == this.tpAccount.name);
                this.user_credits = this.user_info.credits / 10000;
                var rate_100 = 25;
                var rate_50 = new Array(11, 24);
                var rate_20 = new Array(6, 16, 21);
                var rate_10 = new Array(1, 10, 26);
                var rate_5 = new Array(3, 13, 18, 21);
                var rate_2 = new Array(2, 8, 17, 28);
                var rate_0_1 = new Array(5, 9, 12, 14, 19);
                var rate_0_0_1 = new Array(4, 7, 15, 20, 23, 27);


            if (this.running) {
                if (this.user_credits != this.old_credits) {
                    var last_rate = (this.user_credits - this.old_credits) / this.old_bet_amount;
                    if (last_rate >= 80) {
                        this.stop_at(rate_100);
                    } else if (last_rate >= 40) {
                        this.stop_at(rate_50[Math.floor(Math.random() * 2)]);
                    } else if (last_rate >= 15) {
                        this.stop_at(rate_20[Math.floor(Math.random() * 3)]);
                    } else if (last_rate >= 8) {
                        this.stop_at(rate_10[Math.floor(Math.random() * 3)]);
                    } else if (last_rate >= 3) {
                        this.stop_at(rate_5[Math.floor(Math.random() * 4)]);
                    } else if (last_rate >= 1) {
                        this.stop_at(rate_2[Math.floor(Math.random() * 4)]);
                    } else if (last_rate >= 0.05) {
                        this.stop_at(rate_0_1[Math.floor(Math.random() * 5)]);
                    } else if (last_rate >= 0.005) {
                        this.stop_at(rate_0_0_1[Math.floor(Math.random() * 6)]);
                    }
                }
            }
            }).catch((err) => {
                alert(err)
            })
        },
        deposit: function (amount) {
            play_se("se_click");
            amount = new Number(amount).toFixed(4);
            // console.log(amount);
            this.eos.transfer(this.account.name, "happyeosslot", amount + " EOS", "buy")
                .then(() => {
                    play_se("se_buy");
                    this.get_current_balance();
                    alert("充值成功");
                }).catch((err) => {
                    alert(err.toString());
                });
        },
        tpDeposit: function (amount) {
            amount = new Number(amount).toFixed(4);
            tp.eosTokenTransfer({
                from: this.tpAccount.name,
                to: 'happyeosslot',
                amount: amount,
                tokenName: 'EOS',
                precision: 4,
                contract: 'eosio.token',
                memo: 'buy'
            }).then((data) => {
            if (data.result) {
                alert("充值成功：" + amount)
                this.get_current_balance();
            } else {
                this.notification('error', '兑换失败',"");
            }
            }).catch((err)=>{
                this.notification('error', '兑换失败', err.toString());
            })
        },
        withdraw: function (amount) {
            play_se("se_click");
            amount = new Number(parseInt(amount)).toFixed(4);

            if(isPc()){
                var requiredFields = this.requiredFields;
                this.eos.contract('happyeosslot', {
                    requiredFields
                }).then(contract => {
                    contract.sell(this.account.name, amount + " HPY", {
                        authorization: [`${this.account.name}@${this.account.authority}`]
                    });
                })
                .then(() => {
                        play_se("se_withdraw");
                        this.get_current_balance();
                    }).catch((err) => {
                        alert(err.toString());
                    });
            }else{
               //tokenpocket
               //  alert("sell" + JSON.stringify(this.tpAccount))
                tp.pushEosAction({
                    actions: [
                        {
                            account: 'happyeosslot',//合约
                            name: 'sell',//方法
                            authorization: [
                                {
                                    actor: this.tpAccount.name,
                                    permission: 'active'
                                }],
                            data: {
                                account: this.tpAccount.name,
                                credits:  amount
                            }
                        }
                    ]
                }).then(() => {
                    this.tpBalance();
                    play_se("se_withdraw");
                this.notification('succeeded', '兑换成功');
            }).catch((err) => {
                    this.notification('error', '兑换失败', err.toString());
            });
            }

        },
        setIdentity: function (identity) {
            this.account = identity.accounts.find(acc => acc.blockchain === 'eos');
            this.eos = scatter.eos(network, Eos, {});
            this.requiredFields = {
                accounts: [network]
            };
            this.get_current_balance();
        },
        init_scatter: function () {
            if (this.eos != null) return;
            if (this.tpAccount != null) return;
            if (isPc()) {
                if (!('scatter' in window)) {
                    alert("没有找到Scatter.");
                } else {
                    scatter.getIdentity({
                            accounts: [{
                                chainId: network.chainId,
                                blockchain: network.blockchain
                            }]
                        })
                        .then(identity => {
                            this.setIdentity(identity);
                        })
                        .catch(err => {
                            alert("Scatter 初始化失败.");
                        });
                }
            } else {
                //移动端
                this.tpConnected = tp.isConnected();
                if (this.tpConnected) {
                    //test
                    // app.tpBalance();
                    tp.getWalletList("eos").then(function (data) {
                        this.tpAccount = data.wallets.eos[0];
                    });
                } else {
                    alert("请下载TokenPocket") //待完善
                }
            }
        },
        init_tokenpocket:function () {
            if(this.tpConnected){
               /* tp.getWalletList("eos").then(function (data) {
                    this.tpAccount = data.wallets.eos[0]
                });*/
                tp.getCurrentWallet("eos").then(function (data) {
                    if(data.result){
                        this.tpAccount = data.data;
                    }else{
                        this.notification("error",data.msg);
                    }

                })
            }else {
                this.notification('succeeded', '请下载TP,并登陆');
            }
        },
        roll: function () {
            var index = this.index;
            var count = this.count;
            index += 1;
            if (index > count) {
                index -= count
            }
            this.index = index;
            return false;
        },
        createHexRandom: function () {
            var num = '';
            for (i = 0; i < 64; i++) {
                var tmp = Math.floor(Math.random() * 16);
                if (tmp > 9) {
                    switch (tmp) {
                        case (10):
                            num += 'a';
                            break;
                        case (11):
                            num += 'b';
                            break;
                        case (12):
                            num += 'c';
                            break;
                        case (13):
                            num += 'd';
                            break;
                        case (14):
                            num += 'e';
                            break;
                        case (15):
                            num += 'f';
                            break;
                    }
                } else {
                    num += tmp;
                }
            }
            return num;
        },
        start_roll: function () {
            play_se("se_click");
            if (this.running) return;
            if(isPc()){
                this.init_scatter();
            }else
            {
                this.init_tokenpocket();
            }

            var amount = this.bet_input;
            if (this.bet_input == "") {
                amount = "1.0000"
            }
            if(isPc()){
            this.eos.transfer(this.account.name, "happyeosslot", amount + " EOS", "bet " + this.createHexRandom())
                .then(() => {
                    play_se("se_startrolling");
                    this.running = true;
                    this.last_bet = amount;
                    this.roll_loop();
                    this.get_roll_result();
                    }).catch((err) => {
                        this.notification('error', '异常', err.toString());
                    });
            }else
            {
                // alert("帐号："+ JSON.stringify(this.tpAccount))
                //移动端
                amount = new Number(amount).toFixed(4);
                tp.eosTokenTransfer({
                    from: this.tpAccount.name,
                    to: 'happyeosslot',
                    amount: amount,
                    tokenName: 'EOS',
                    precision: 4,
                    contract: 'eosio.token',
                    memo: 'bet'
                }).then(() => {
                    play_se("se_startrolling");
                    this.running = true;
                    this.old_credits = this.user_credits - amount;
                    this.old_bet_amount = amount;
                    this.roll_loop();
                }).catch((err) => {
                    this.notification('error', '异常', err.toString());
                })
            }
        },
        roll_loop: function () {
            play_se("se_rolling");
            this.times += 1;
            this.roll();
            if (this.times > this.cycle + 10 && this.prize == this.index) {
                clearTimeout(this.timer);
                this.prize = -1;
                this.times = 0;
                this.running = false;
            } else {
                if (this.times < this.cycle) {
                    if (this.speed > 200) {
                        this.speed -= 100;
                    } else {
                        this.speed -= 10;
                    }
                } else {
                    if (this.prize != -1) {
                        if (this.times > this.cycle + 10 && ((this.prize == 1 && this.index == this.count) || this.prize == this.index + 1)) {
                            this.speed += 110;
                        } else {
                            this.speed += 20;
                        }
                    } else {
                        if(isPc()){
                            
                        }else {
                            if(this.tpConnected) {
                                this.tpBalance();
                            }else {
                                this.notification('succeeded', '请下载TokenPocket或打开');
                            }
                        }

                    }
                }
                if (this.speed < 40) {
                    this.speed = 40;
                };
                if (this.speed > 500) {
                    this.speed = 500;
                }
                this.timer = setTimeout(this.roll_loop, this.speed); //循环调用
            }
        },
        stop_at: function (stop_position) {
            if (this.prize == -1) {
                clearTimeout(this.result_timer);
                this.prize = stop_position;
                this.get_current_balance();
            }
        },
        getEosBalance:function () {
            alert(2)
            alert(this.tpAccount.name)
            tp.getEosBalance({
                account: this.tpAccount.name,
                contract: 'eosio.token',
                symbol: 'EOS'
            }).then(function(data){
                alert(JSON.stringify(data));
                alert(data.data.balance)
                this.user_eos_balance = data.data.balance[0].split(' ', 1)[0];
        })
        },
    },
    computed: {}
});

async function requestId() {
    if (app.eos != null) return;
    // if (app.tpAccount != null) return;
    if (isPc()) {
        //PC端
        if (!('scatter' in window)) {
            alert("你需要Scatter来玩这个游戏");
        } else {
            const identity = await scatter.getIdentity({
                accounts: [{
                    chainId: network.chainId,
                    blockchain: network.blockchain
                }]
            });
            app.account = identity.accounts.find(acc => acc.blockchain === 'eos');
            scatter.getIdentity({
                accounts: [{
                    chainId: network.chainId,
                    blockchain: network.blockchain
                }]
            });
            app.setIdentity(identity);
        }
    } else {
        //移动端
        app.tpConnected = tp.isConnected();
        alert(app.tpConnected)
        if (app.tpConnected) {
            tp.getWalletList("eos").then(function (data) {
                app.tpAccount = data.wallets.eos[0]
                app.getEosBalance();
            });
        } else {
            alert("请下载TokenPocket") //待完善
        }
    }
};

//判断是PC还是移动端
function isPc() {
    //移动端PC端判断
    return /Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent) ? false : true;
} 

