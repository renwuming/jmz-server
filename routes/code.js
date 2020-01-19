const codes = [
  "加州",
  "机器人",
  "鱼雷",
  "羊毛",
  "纽约",
  "蜜蜂",
  "晚餐",
  "沙漏",
  "糖果",
  "镜子",
  "蛋糕",
  "日历",
  "诗",
  "奖牌",
  "婚礼",
  "市场",
  "餐厅",
  "观光",
  "网络",
  "生日",
  "报纸",
  "毒物",
  "锤子",
  "磁铁",
  "水",
  "记忆",
  "速度",
  "刺客",
  "口袋",
  "护具",
  "图书馆",
  "鸡蛋",
  "毛毯",
  "汽油",
  "塔",
  "科学",
  "诱饵",
  "法国",
  "楼梯间",
  "心理学家",
  "夜晚",
  "高尔夫",
  "戏院",
  "羽毛",
  "牛仔",
  "弓箭",
  "小丑",
  "火箭",
  "扑克",
  "大象",
  "媒体",
  "手",
  "正方形",
  "外太空",
  "直升机",
  "木偶",
  "瘟疫",
  "海洋",
  "棒球",
  "雕塑",
  "鼓",
  "驱魔",
  "神殿",
  "童年",
  "潜水员",
  "早餐",
  "狼",
  "衣服",
  "字典",
  "火山",
  "屠宰场",
  "贿赂",
  "能量",
  "周末",
  "马",
  "埃及",
  "骷髅",
  "潜水艇",
  "奥林匹克",
  "独眼怪",
  "厨房",
  "行李箱",
  "腿",
  "雪",
  "文艺复兴",
  "峡谷",
  "咖啡",
  "快乐",
  "古代",
  "地铁",
  "蜂蜜",
  "森林",
  "小号",
  "索引",
  "德州",
  "神秘",
  "旗帜",
  "降落伞",
  "跳舞",
  "蜡烛",
  "夏天",
  "屋顶",
  "猫",
  "地毯",
  "蟑螂",
  "秋天",
  "贵族",
  "企鹅",
  "钱",
  "疾病",
  "间谍",
  "管家",
  "银行",
  "出生",
  "考古学",
  "书",
  "老鼠",
  "河",
  "花园",
  "武术",
  "天气",
  "鞋子",
  "鸡尾酒",
  "办公室",
  "中国",
  "针",
  "节日",
  "压力",
  "牙齿",
  "配方",
  "苹果",
  "手术",
  "红色",
  "房间",
  "史前时代",
  "道路",
  "松鼠",
  "传说",
  "怪胎",
  "电视",
  "鼻子",
  "蛮横",
  "噩梦",
  "巨人",
  "尖叫",
  "坠落",
  "卫星",
  "抗议",
  "身体",
  "音乐家",
  "金属",
  "中世纪",
  "蓝色",
  "皮肤",
  "假期",
  "难过",
  "俄罗斯",
  "建筑学",
  "星球",
  "斗篷",
  "侦探",
  "死亡",
  "车",
  "雨",
  "奶酪",
  "军队",
  "萨克斯",
  "警察",
  "枪",
  "锁链",
  "蝎子",
  "博物馆",
  "花生",
  "睡觉",
  "脚踏车",
  "钢琴",
  "女巫",
  "巧克力",
  "绵羊",
  "胡子",
  "橘子",
  "骗子",
  "吉他",
  "沙漠",
  "资本主义",
  "面包",
  "小提琴",
  "胃",
  "三明治",
  "棉花",
  "暴风雨",
  "井",
  "脚",
  "艺术",
  "医院",
  "公主",
  "饼干",
  "断头台",
  "梦想",
  "僵尸",
  "机械",
  "教堂",
  "床",
  "舌头",
  "礼物",
  "椅子",
  "游戏",
  "胡萝卜",
  "内衣",
  "歌剧",
  "曲棍球",
  "窗户",
  "翅膀",
  "自然",
  "生物学",
  "帽子",
  "海龟",
  "皇冠",
  "恶魔",
  "塑料",
  "非洲",
  "墨水",
  "鬼",
  "胶水",
  "章鱼",
  "大炮",
  "侏儒",
  "鲸鱼",
  "飞行员",
  "春天",
  "矛",
  "火",
  "恐龙",
  "救护车",
  "愤怒",
  "灰尘",
  "铅笔",
  "时钟",
  "刀",
  "停车场",
  "紫色",
  "妈妈",
  "水果",
  "玻璃",
  "狩猎",
  "传统",
  "天空",
  "化学",
  "革命",
  "蛇",
  "绿洲",
  "地下室",
  "密码锁",
  "冰箱",
  "西装",
  "澳洲",
  "门",
  "笼子",
  "外星人",
  "蜥蜴",
  "边境",
  "复制品",
  "半人马",
  "水电工",
  "枫树",
  "裤子",
  "领带",
  "精灵",
  "云",
  "乘客",
  "砖块",
  "面具",
  "参议院",
  "头",
  "蘑菇",
  "数学",
  "意外",
  "长颈鹿",
  "信仰",
  "地下城",
  "轨道",
  "青蛙",
  "香水",
  "铃铛",
  "相机",
  "角",
  "漫画书",
  "疯狂",
  "音乐会",
  "桌子",
  "三角形",
  "食人魔",
  "旅馆",
  "爱",
  "吸血鬼",
  "金字塔",
  "午餐",
  "炸弹",
  "脸",
  "香蕉",
  "天才",
  "短信",
  "实验室",
  "皮革",
  "罗盘",
  "游泳池",
  "钻石",
  "攻击",
  "酒精",
  "动物园",
  "出口",
  "爵士",
  "狮子",
  "经济学",
  "味道",
  "傍晚",
  "雪橇",
  "拼图",
  "国王",
  "灯泡",
  "戒指",
  "父亲",
  "电影院",
  "龙",
  "飞马",
  "岛屿",
  "偷窥",
  "键盘",
  "马铃薯",
  "奶油",
  "电梯",
  "蜘蛛",
  "天堂",
  "水族馆",
  "项链",
  "珍珠",
  "小麦",
  "黑色",
  "冬天",
  "瓶子",
  "婴儿",
  "早晨",
  "显微镜",
  "老师",
  "哲学",
  "猫头鹰",
  "热",
  "赌场",
  "蝴蝶",
  "电脑",
  "树根",
  "烤箱",
  "战争",
  "工作",
  "纪念碑",
  "怪物",
  "厕所",
  "秘书",
  "血",
  "玩具",
  "盾牌",
  "孔雀",
  "耳朵",
  "恐怖",
  "彩虹",
  "名人",
  "黑手党",
  "迷宫",
  "山",
  "丛林",
  "绿色",
  "白色",
  "船",
  "黄色",
  "稻草人",
  "啤酒",
  "披萨",
  "飞机",
  "猪",
  "马戏团",
  "洞穴",
  "狗",
  "世界末日",
  "海盗",
  "科幻",
  "时间",
  "学校",
  "圆圈",
  "尸体",
  "鸟",
  "军营",
  "电线",
  "共产主义",
  "交响乐团",
  "剑",
  "药",
  "地球",
  "镭射",
  "语言",
  "独角兽",
  "北极",
  "电",
  "变色龙",
  "照片",
  "电话",
  "选举",
  "野餐",
  "墙壁",
  "鸟巢",
  "肥皂",
  "建筑物",
  "和尚",
  "按钮",
  "美人鱼",
  "笑",
  "足球",
  "比赛",
  "运动员",
  "魔法",
  "医生",
  "吕洞宾",
  "零度",
  "冰",
  "大海",
  "特工",
  "阿尔卑斯山",
  "美国",
  "天使",
  "澳大利亚",
  "亚马逊",
  "空气",
  "南极洲",
  "后背",
  "电池",
  "箱",
  "海滩",
  "浆果",
  "真空",
  "豪车",
  "运气",
  "拇指",
  "苍蝇",
  "鲸",
  "电极",
  "希腊",
  "公平",
  "叉",
  "手套",
  "草",
  "黄金",
  "高雅",
  "挂钩",
  "印度",
  "果酱",
  "冰淇淋",
  "好莱坞",
  "木星",
  "喷射",
  "水牛",
  "债券",
  "喇叭",
  "瓶",
  "北京",
  "节拍",
  "门栓",
  "轰隆",
  "柏林",
  "纽扣",
  "靴子",
  "树皮",
  "故障",
  "桥",
  "街区",
  "舞会",
  "酒吧",
  "乐队",
  "小孩",
  "番茄酱",
  "袋鼠",
  "骑士",
  "尼斯湖",
  "小精灵",
  "领导",
  "伦敦",
  "线",
  "嘴",
  "月亮",
  "律师",
  "膝盖",
  "大理石",
  "水星",
  "皮带",
  "账单",
  "熊",
  "刷子",
  "铃",
  "蝙蝠",
  "弓",
  "漫画",
  "加拿大",
  "吊车",
  "百慕大",
  "寒冷",
  "十字架",
  "卡牌",
  "改变",
  "支票",
  "鸭子",
  "欧洲",
  "约会",
  "日",
  "舞蹈",
  "矮人",
  "英格兰",
  "鹰",
  "草图",
  "厨师",
  "骰子",
  "滴",
  "俱乐部",
  "细胞",
  "稻草",
  "货车",
  "状况",
  "尖刺",
  "邮政",
  "手枪",
  "南瓜",
  "水池",
  "英镑",
  "鸭嘴兽",
  "分数",
  "论文",
  "别针",
  "抛",
  "首都",
  "循环",
  "密码",
  "王冠",
  "碰撞",
  "契约",
  "胸",
  "汽车",
  "帽",
  "铜",
  "法院",
  "悬崖",
  "混合物",
  "阴谋",
  "报刊",
  "浆糊",
  "玩耍",
  "毒药",
  "小说",
  "油",
  "坚果",
  "忍者",
  "模特",
  "矿",
  "鼹鼠",
  "莫斯科",
  "柠檬",
  "披风",
  "土星",
  "锁",
  "光线",
  "薄荷",
  "盗贼",
  "尺子",
  "罗宾汉",
  "文件",
  "球拍",
  "电影",
  "雪人",
  "空间",
  "摇摆",
  "连接",
  "笔记",
  "滴答",
  "咒语",
  "头巾",
  "屏幕",
  "洗衣机",
  "护照",
  "指甲",
  "橄榄",
  "轨迹",
  "幽灵",
  "平底锅",
  "大富豪",
  "学位",
  "甲板",
  "封面",
  "钻头",
  "蠕虫",
  "雄鹿",
  "衣着",
  "钥匙",
  "士兵",
  "充电",
  "火车",
  "天平",
  "坑",
  "溪流",
  "醒",
  "公园",
  "网",
  "莎士比亚",
  "墨西哥",
  "转换",
  "兽医",
  "火炬",
  "平板",
  "科学家",
  "服务生",
  "数字",
  "粉丝",
  "领域",
  "瀑布",
  "股票",
  "大使馆",
  "战士",
  "走私者",
  "火腿",
  "凤凰",
  "港口",
  "栅栏",
  "望远镜",
  "阴影",
  "射线",
  "划船",
  "恒星",
  "棍",
  "隧道",
  "声音",
  "华盛顿",
  "罗马",
  "根",
  "瞳孔",
  "脊椎",
  "导弹",
  "斑点",
  "海豹",
  "蟋蟀",
  "王后",
  "小鸡",
  "旅行",
  "号角",
  "长毛象",
  "象牙",
  "角色",
  "引擎",
  "眼",
  "塑胶",
  "体育场",
  "灵魂",
  "盘子",
  "摇滚",
  "手表",
  "投掷",
  "护士",
  "摩天楼",
  "伐木",
  "馅饼",
  "罢工",
  "风",
  "标签",
  "器官",
  "鲨鱼",
  "马蹄铁",
  "回合",
  "兔子",
  "奇异果",
  "喜马拉雅山",
  "匕首",
  "庭院",
  "长笛",
  "千斤顶",
  "射击",
  "尾巴",
  "鼻涕虫",
  "波浪",
  "玫瑰",
  "管",
  "寺庙",
  "超级英雄",
  "商店",
  "奥林匹斯山",
  "弦",
  "东京",
  "土耳其",
  "鞋",
  "手掌",
  "转轮",
  "职员",
  "生命",
  "水龙头",
  "蛤蟆",
  "熊猫",
  "羊驼",
  "骆驼",
  "河马",
  "考拉",
  "海豚",
  "猩猩",
  "鸵鸟",
  "天鹅",
  "熊本熊",
  "黑寡妇",
  "屎壳郎",
  "小鲜肉",
  "直播",
  "电子竞技",
  "微博",
  "外卖",
  "众筹",
  "吃土",
  "污",
  "滑稽",
  "单身狗",
  "屁股",
  "宝宝",
  "复读机",
  "萌萌哒",
  "版图",
  "合作",
  "团灭",
  "一刻",
  "收纳",
  "二手",
  "桌游",
  "战报",
  "益智",
  "代入感",
  "兵马俑",
  "长城",
  "灯笼",
  "风筝",
  "皮影戏",
  "舞龙",
  "功夫",
  "葫芦娃",
  "孙悟空",
  "京剧",
  "孔子",
  "书法",
  "茶",
  "城管",
  "指南针",
  "雨衣",
  "瑜伽",
  "健美",
  "慢跑",
  "星座",
  "爆竹",
  "快递",
  "丁克",
  "裸婚",
  "健身",
  "素食",
  "打车",
  "八卦",
  "月光",
  "生肖",
  "相亲",
  "狼人",
  "先知",
  "德鲁伊",
  "萨满",
  "麻瓜",
  "兽人",
  "巫师",
  "狐狸精",
  "阎王",
  "狮鹫",
  "嘻哈",
  "古典",
  "流行",
  "民谣",
  "朋克",
  "古筝",
  "竖琴",
  "架子鼓",
  "节奏",
  "痤疮",
  "英亩",
  "附录",
  "广告",
  "升",
  "鳄鱼",
  "踝关节",
  "冷漠",
  "鼓掌",
  "苹果酱",
  "应用",
  "无敌舰队",
  "宇航员",
  "阿姨",
  "保姆",
  "骨干",
  "袋子",
  "气球",
  "栏杆",
  "篮球",
  "沙滩",
  "豆茎",
  "臭虫",
  "贝多芬",
  "单车",
  "自行车",
  "广告牌",
  "咬",
  "铁匠",
  "毯子",
  "漂白剂",
  "蓝图",
  "钝",
  "模糊",
  "舟",
  "展位",
  "领结",
  "盒子",
  "男孩",
  "勇敢",
  "新娘",
  "西兰花",
  "破坏",
  "扫帚",
  "挫伤",
  "黑发",
  "泡沫",
  "巴士",
  "买",
  "小屋",
  "计算器",
  "营地",
  "糖",
  "制图",
  "唱片",
  "天花板",
  "世纪",
  "记录",
  "冠军",
  "充电器",
  "啦啦队长",
  "象棋",
  "咀嚼",
  "鸡",
  "鸣响",
  "圆",
  "粘土",
  "顺时针",
  "线索",
  "教练",
  "煤",
  "过山车",
  "装配",
  "冷",
  "学院",
  "舒适",
  "计算机",
  "圆锥",
  "烹饪",
  "公司",
  "绳索",
  "咳嗽",
  "奶牛",
  "蜡笔",
  "脆",
  "批评",
  "乌鸦",
  "巡航",
  "面包屑",
  "外壳",
  "袖口",
  "窗帘",
  "沙皇",
  "爸爸",
  "黎明",
  "白天",
  "深",
  "缺点",
  "齿",
  "牙医",
  "书桌",
  "酒窝",
  "脏",
  "拆除",
  "挖沟",
  "潜水者",
  "狗窝",
  "洋娃娃",
  "排水",
  "抓",
  "裙子",
  "喝",
  "烘干机",
  "灌篮",
  "耳",
  "吃",
  "肘部",
  "电气",
  "进化",
  "眉毛",
  "幻想",
  "快",
  "宴请",
  "封建",
  "虚构",
  "手指",
  "第一",
  "钓鱼",
  "修",
  "兴奋",
  "旗杆",
  "废料",
  "花",
  "流感",
  "激动",
  "雾",
  "衬托",
  "前额",
  "永远",
  "雀斑",
  "运送",
  "边缘",
  "蛙",
  "皱眉",
  "疾驰",
  "宝石",
  "姜",
  "女孩",
  "眼镜",
  "地精",
  "再见",
  "奶奶",
  "葡萄",
  "灰",
  "绿",
  "口香糖",
  "橡皮",
  "头发",
  "半",
  "掌控",
  "手写",
  "挂",
  "高兴",
  "孵化",
  "头痛",
  "心",
  "基金",
  "边",
  "藏",
  "冰球",
  "作业",
  "喇叭声",
  "房",
  "游艇",
  "拥抱",
  "加湿器",
  "饿",
  "障碍",
  "伤害",
  "内爆",
  "调查",
  "引诱",
  "讽刺",
  "常青藤",
  "翡翠",
  "牛仔裤",
  "果冻",
  "喷气",
  "杂志",
  "跳",
  "杀手",
  "公斤",
  "下跪",
  "花边",
  "梯子",
  "瓢虫",
  "拖延",
  "一圈",
  "洗衣店",
  "草地",
  "字母",
  "等级",
  "生活方式",
  "光",
  "光剑",
  "石灰",
  "棒棒糖",
  "沙发",
  "忠诚",
  "歌词",
  "信箱",
  "记号",
  "吉祥物",
  "桅杆",
  "火柴棍",
  "大副",
  "床垫",
  "混乱",
  "仲夏",
  "错误",
  "现代",
  "塑造",
  "妈",
  "周一",
  "猴子",
  "监视器",
  "擦",
  "蛾",
  "摩托车",
  "鼠",
  "割草机",
  "泥巴",
  "音乐",
  "静音",
  "邻居",
  "中子",
  "侄女",
  "夜",
  "鼻",
  "桨",
  "天文台",
  "老",
  "威严",
  "不透明",
  "瓶撬",
  "组织",
  "欢迎",
  "序幕",
  "桶",
  "画",
  "睡衣",
  "宫殿",
  "纸",
  "山寨",
  "聚会",
  "卒",
  "梨",
  "笔",
  "钟摆",
  "便士",
  "辣椒",
  "哲人",
  "手机",
  "猪舍",
  "枕头",
  "乒乓",
  "格子",
  "计划",
  "平",
  "操场",
  "犁田",
  "水管工",
  "点",
  "极点",
  "冰棒",
  "人口",
  "公文包",
  "寄",
  "出版商",
  "谜题",
  "检疫",
  "皇后",
  "流沙",
  "安静",
  "赛",
  "收音机",
  "筏",
  "破布",
  "雨水",
  "区域",
  "回收",
  "红",
  "遗憾",
  "退还",
  "报复",
  "肋骨",
  "溜冰场",
  "轮",
  "发情期",
  "忧伤",
  "安全",
  "盐",
  "沙盒",
  "腰带",
  "恐惧",
  "刀疤",
  "卑鄙",
  "攀登",
  "磨损",
  "海贝",
  "季节",
  "句子",
  "设置",
  "轴",
  "影子 ",
  "香波",
  "被单",
  "警官",
  "海难",
  "衬衫",
  "鞋带",
  "短",
  "喷头",
  "收缩",
  "病",
  "侧影",
  "歌手",
  "滑冰",
  "划水",
  "扣篮",
  "吊索",
  "慢",
  "下降",
  "打喷嚏",
  "紧抱",
  "太空",
  "节约",
  "演讲者",
  "吐痰",
  "抹掉",
  "缠绕",
  "勺子",
  "春",
  "广场",
  "楼梯",
  "长期",
  "州",
  "棍子",
  "火炉",
  "蒸汽",
  "流线型",
  "条纹",
  "学生",
  "日出",
  "寿司",
  "沼泽",
  "毛衣",
  "游泳",
  "说",
  "出租车",
  "茶壶",
  "青少年",
  "十",
  "网球",
  "贼",
  "思考",
  "王座",
  "穿越",
  "雷",
  "潮水",
  "虎",
  "脚尖",
  "绝顶",
  "疲倦",
  "纸巾",
  "工具",
  "牙刷",
  "龙卷风",
  "锦标赛",
  "拖拉机",
  "财宝",
  "旅程",
  "卡车",
  "浴盆",
  "辅导",
  "鼻音",
  "理解",
  "类型",
  "失业",
  "升级",
  "背心",
  "视野",
  "饶舌",
  "西瓜",
  "蜡",
  "除草",
  "焊接工",
  "轮椅",
  "鞭打",
  "搅拌",
  "口哨",
  "白",
  "假发",
  "风车",
  "愿望",
  "世界",
  "禅",
  "拉链",
  "党员",
  "电风扇",
  "周杰伦",
  "后羿",
  "微信",
  "语文",
  "泰国",
  "人妖",
  "你好",
  "地中海",
  "据点",
  "鸽子",
  "WIFI",
  "光头",
  "阿拉丁神灯",
  "指纹",
  "头绳",
  "手链",
  "口水",
  "歪果仁",
  "视频",
  "美女",
  "农场主",
  "火星",
  "棉签",
  "核桃",
  "100分",
  "拖鞋",
  "芝麻",
  "花盆",
  "瓜子",
  "富饶之城",
  "情书",
  "水杯",
  "空调",
  "暖气",
  "美甲",
  "发电机",
  "智障",
  "抑郁",
  "狂躁",
  "袜子",
  "获奖",
  "颓废",
  "赖床",
  "明天",
  "开学",
  "甲沟炎",
  "阑尾炎",
  "直肠癌",
  "谢谢",
  "对不起",
  "不客气",
  "提交",
  "终于",
  "充电宝",
  "现在",
  "祖宗",
  "讨厌",
  "壁虎",
  "植物园",
  "海洋馆",
  "开封",
  "毛巾",
  "开关",
  "考试",
  "夕阳",
  "益达",
  "冻疮",
  "挂科",
  "甜",
  "口腔溃疡",
  "磁条",
  "同性恋",
  "小程序",
  "科普",
  "亲爱的",
  "表白",
  "孩子",
  "妖娆",
  "一次性",
  "避孕套",
  "震动棒",
  "白虎",
  "华为",
  "调节",
  "体位",
  "尴尬",
  "紧张",
  "考研",
  "支付宝",
  "病毒",
  "通宵",
  "抽烟",
  "喝酒",
  "蹦迪",
  "起床",
  "寓言",
  "特朗普",
  "牺牲",
  "巨乳",
  "盖子",
  "传教士",
  "全垒打",
  "继母",
  "哪吒",
  "偷",
  "肤浅",
  "出轨",
  "高潮",
  "如果",
  "价格",
  "奥特曼",
  "异地恋",
  "狭长",
  "阴阳",
  "隐身",
  "小儿科",
  "国宝",
  "胎盘",
  "哆嗦",
  "卑微",
  "菊花",
  "老干妈",
  "开心果",
  "橙子",
  "牛油果",
  "向日葵",
  "筷子",
  "电磁炉",
  "茅台",
  "五粮液",
  "蟹黄酱",
  "金嗓子",
  "吊兰",
  "梅花",
  "财神",
  "对联",
  "火锅",
  "羊蝎子",
  "脑花",
  "红豆",
  "平面",
  "华丽",
  "花季",
  "沙琪玛",
  "徐福记",
  "喜之郎",
  "耐克",
  "阿迪达斯",
  "本田",
  "一汽",
  "大众",
  "美团",
  "镖局",
  "莫邪",
  "干将",
  "鱼肠",
  "耄耋",
  "沧桑",
  "觊觎",
  "变态",
  "锅包肉",
  "垃圾",
  "贡献",
  "审核",
  "注释",
  "空白",
  "剑龙",
  "翼龙",
  "霸王龙",
  "两栖动物",
  "侏罗纪",
  "解锁",
  "排队",
  "海苔",
  "妖精",
  "按摩",
  "瓷砖",
  "羚羊",
  "合肥",
  "石家庄",
  "哈尔滨",
  "黑龙江",
  "辽宁",
  "沈阳",
  "黄河",
  "长江",
  "兰州",
  "上海",
  "深圳",
  "成都",
  "广东",
  "广西",
  "云南",
  "河南",
  "河北",
  "秦皇岛",
  "陕西",
  "湖北",
  "内蒙古",
  "女真族",
  "碰碰车",
  "皮卡丘",
  "5G",
  "草莓",
  "电线杆",
  "君子",
  "隐私",
  "红绿灯",
  "发动机",
  "法律",
  "弧",
  "口红",
  "枸杞",
  "优惠券",
  "乐高",
  "地图",
  "高铁",
  "化妆",
  "炉灶",
  "梳子",
  "师父",
  "画眉",
  "家暴",
  "毕业",
  "前程",
  "监狱",
  "门神",
  "专家",
  "鉴定",
  "古董",
  "股东",
  "华佗",
  "日志",
  "保温杯",
  "神仙",
  "逍遥",
  "武侠",
  "周华健",
  "星期五",
  "村",
  "热力学",
  "冬奥会",
  "云雀",
  "骨头",
  "曹操",
  "关羽",
  "张飞"
];

module.exports = codes;
