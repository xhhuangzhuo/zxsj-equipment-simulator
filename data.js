// 装备属性模拟器 - 数据
// 4 种副属性
const ATTR_TYPES = ['元御', '专精', '会心', '调息'];

// 15 个装备槽位
// 左侧 7 + 右侧 8
const SLOTS = [
  // 左侧
  { id: 'tou',   name: '头',   group: 'G1', side: 'left', order: 1 },
  { id: 'yi',    name: '衣',   group: 'G2', side: 'left', order: 2 },
  { id: 'shou',  name: '手',   group: 'G2', side: 'left', order: 3 },
  { id: 'wuqi',  name: '武器', group: 'WEAPON', side: 'left', order: 4 },
  { id: 'yao',   name: '腰',   group: 'G2', side: 'left', order: 5 },
  { id: 'tui',   name: '腿',   group: 'G2', side: 'left', order: 6 },
  { id: 'jiao',  name: '脚',   group: 'G1', side: 'left', order: 7 },
  // 右侧
  { id: 'hufu1', name: '护符1', group: 'G1', side: 'right', order: 1, canRare: true },
  { id: 'hufu2', name: '护符2', group: 'G1', side: 'right', order: 2 },  // 玩家只能佩戴 1 个稀有护符, 稀有功能集中在护符1
  { id: 'fa',    name: '法印',  group: 'G3', side: 'right', order: 3, canRare: true },
  { id: 'ling',  name: '令牌',  group: 'G3', side: 'right', order: 4, canRare: true },
  { id: 'xl',    name: '项链',  group: 'G3', side: 'right', order: 5, canRare: true },
  { id: 'shouw', name: '手腕',  group: 'G3', side: 'right', order: 6 },
  { id: 'tianl', name: '天灵',  group: 'G1', side: 'right', order: 7 },
  { id: 'dib',   name: '地宝',  group: 'G1', side: 'right', order: 8 },
];

// 装备基础值
// G1: 头/脚/护符/天/地
// G2: 衣/腿/腰/手
// G3: 法/令/手腕/项链
// WEAPON: 武器 (双同)
const BASE_VALUES = {
  530: {
    // 530-545 仅护符1 实际可选 (其他 G1 UI 不暴露这几个档位)
    G1:     { big: 525,  small: 225, mid: 375 },
  },
  535: {
    G1:     { big: 543,  small: 233, mid: [387, 388] },
  },
  540: {
    WEAPON: { big: 931, small: 399, mid: 665 },
    G1:     { big: 560,  small: 240, mid: 400 },
  },
  545: {
    WEAPON: { big: 938, small: 402, mid: 670 },
    G1:     { big: 578,  small: 248, mid: [412, 413] },
  },
  550: {
    G1:     { big: 595,  small: 255, mid: 425 },
    G2:     { big: 532,  small: 228, mid: 380 },
    G3:     { big: 1309, small: 561, mid: 935 },
    WEAPON: { big: 945,  small: 405, mid: 675 },
  },
  555: {
    WEAPON: { big: 952, small: 408, mid: 680 },
    G1:     { big: 613,  small: 263, mid: [437, 438] },
  },
  560: {
    G1:     { big: 630,  small: 270, mid: 450 },
    G2:     { big: 566,  small: 242, mid: 404 },
    G3:     { big: 1386, small: 594, mid: 990 },
    WEAPON: { big: 959,  small: 411, mid: 685 },
  },
  565: {
    G1:     { big: 648,  small: 278, mid: [462, 463] },  // 大小四舍五入, 中游戏拆 462+463
    G2:     { big: 582,  small: 249, mid: [415, 416] },  // 560→570 折半 (404+11.75)
    G3:     { big: 1425, small: 611, mid: [1017, 1018] },  // 560→570 折半 (990+27.5)
    WEAPON: { big: 966,  small: 414, mid: 690 },
  },
  570: {
    G1:     { big: 665,  small: 285, mid: 475 },
    G2:     { big: 598,  small: 257, mid: [427, 428] },  // 游戏中拆 427+428
    G3:     { big: 1463, small: 627, mid: 1045 },
    WEAPON: { big: 973,  small: 417, mid: 695 },
  },
  575: {
    // 仅护符2 使用: 按 G1 每 5 装等 mid+12.5 外推 (无真实数据)
    HUFU2:  { big: 683,  small: 293, mid: [487, 488] },
  },
  580: {
    // 仅护符2 使用: 按 G1 每 10 装等 mid+25 外推 (无真实数据)
    HUFU2:  { big: 700,  small: 300, mid: 500 },
  },
};

// 稀有护符1 的 4 维基础值 (按装等)
// 用户给的真实数据: 530=222, 545=247, 550=255, 570=285
// 535/540/555/560/565 用分段线性插值, 后续可用真实数据覆盖
const RARE_HUFU1_VALUE = {
  530: 222,
  535: 230,  // 插值
  540: 239,  // 插值
  545: 247,
  550: 255,
  555: 263,  // 插值
  560: 270,  // 插值
  565: 278,  // 插值
  570: 285,
};

// 强化系数: k = 0.03n + 0.12 (n=1..16), +0 时无加成
function ENHANCE_COEFF(n) {
  if (!n || n <= 0) return 0;
  return 0.03 * n + 0.12;
}

// 角色天生属性 (调息=0, 其他 800)
const INNATE = { '元御': 800, '专精': 800, '会心': 800, '调息': 0 };

// 机巧盘每块
const JIQIAO_BLOCK = 540;

// 丹药 (单选, 3 等级)
const DAN = { '高': 900, '中': 798, '低': 702 };

// 食物 (单选, 3 等级)
const FOOD = { '高': 600, '中': 532, '低': 468 };

// 符文 (4 等级, 共 9 颗)
const RUNE = { '顶': 335, '高': 267, '中': 200, '低': 156 };

// 稀有护符额外 3 条加成 (每条 +1500)
const RARE_AMULET_EXTRA = 1500;
