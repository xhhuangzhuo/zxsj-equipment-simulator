// 装备属性模拟器 - 计算逻辑

// 计算单件装备的词条 [{attr, value}, ...]
function calcSlotEntries(slot, cfg) {
  const entries = [];
  const level = cfg.level || 550;
  const enhance = cfg.enhance || 0;
  const attrs = (cfg.attrs && cfg.attrs.length) ? cfg.attrs : [];

  // 稀有装备分支
  if (cfg.isRare && slot.canRare) {
    if (slot.id === 'hufu1') {
      // 稀有护符: 4 个不同属性 (元御/专精/会心/调息), 基础值按装等 (RARE_HUFU1_VALUE) + 强化加成
      const k = ENHANCE_COEFF(enhance);
      const baseValue = RARE_HUFU1_VALUE[level] || 222;
      const extra = Math.round(baseValue * k);
      ATTR_TYPES.forEach(a => entries.push({ attr: a, value: baseValue + extra }));
    } else if (slot.id === 'xl' || slot.id === 'ling') {
      // 稀有项链/令牌: 中中小, 3 词条同属性 = attrs[0], 全部乘强化系数
      const g3 = BASE_VALUES[level] && BASE_VALUES[level].G3;
      if (!g3) return entries;
      const k = ENHANCE_COEFF(enhance);
      const m = g3.mid;
      const s = g3.small;
      const a = attrs[0] || ATTR_TYPES[0];
      if (Array.isArray(m)) {
        entries.push({ attr: a, value: m[0] + Math.round(m[0] * k) });
        entries.push({ attr: a, value: m[1] + Math.round(m[1] * k) });
      } else {
        const extra = Math.round(m * k);
        entries.push({ attr: a, value: m + extra });
        entries.push({ attr: a, value: m + extra });
      }
      entries.push({ attr: a, value: s + Math.round(s * k) });
    } else if (slot.id === 'fa') {
      // 稀有法印: 大小小, 大=元御固定, 小1=非元御(attrs[1]), 小2=元御固定, 全部乘强化系数
      const g3 = BASE_VALUES[level] && BASE_VALUES[level].G3;
      if (!g3) return entries;
      const k = ENHANCE_COEFF(enhance);
      const b = g3.big;
      const s = g3.small;
      const small1 = (attrs[1] && attrs[1] !== '元御') ? attrs[1] : '专精';
      entries.push({ attr: '元御', value: b + Math.round(b * k) });   // 大
      entries.push({ attr: small1, value: s + Math.round(s * k) });   // 小1
      entries.push({ attr: '元御', value: s + Math.round(s * k) });   // 小2
    }
    return entries;
  }

  // 普通装备
  let base = BASE_VALUES[level] && BASE_VALUES[level][slot.group];
  // 护符2 特殊: 575/580 用 HUFU2 key (其他装备不支持这两个装等)
  if (!base && slot.id === 'hufu2' && BASE_VALUES[level]) {
    base = BASE_VALUES[level].HUFU2;
  }
  if (!base) return entries;  // 防御: 装等/组别数据缺失
  const k = ENHANCE_COEFF(enhance);

  if (cfg.type === 'mid_mid') {
    // 中中 (同数双 = 同值, 不同类型)
    let attr1 = attrs[0] || ATTR_TYPES[0];
    let attr2 = attrs[1] || ATTR_TYPES[1];
    // 防御: 强制 attr2 跟 attr1 不同
    if (attr2 === attr1) {
      attr2 = ATTR_TYPES.find(a => a !== attr1) || ATTR_TYPES[1];
    }
    if (Array.isArray(base.mid)) {
      // 570 第二组特殊: 427 + 428
      entries.push({ attr: attr1, value: base.mid[0] + Math.round(base.mid[0] * k) });
      entries.push({ attr: attr2, value: base.mid[1] + Math.round(base.mid[1] * k) });
    } else {
      const m = base.mid;
      const extra = Math.round(m * k);
      entries.push({ attr: attr1, value: m + extra });
      entries.push({ attr: attr2, value: m + extra });
    }
  } else {
    // 大+小 (默认)
    const bAttr = attrs[0] || ATTR_TYPES[0];
    let sAttr = attrs[1] || ATTR_TYPES[1];
    // 防御: 强制 sAttr 跟 bAttr 不同
    if (sAttr === bAttr) {
      sAttr = ATTR_TYPES.find(a => a !== bAttr) || ATTR_TYPES[1];
    }
    entries.push({ attr: bAttr, value: base.big + Math.round(base.big * k) });
    entries.push({ attr: sAttr, value: base.small + Math.round(base.small * k) });
  }

  return entries;
}

// 汇总所有系统的属性 (按种类)
function calcAll(state) {
  const result = { '元御': 0, '专精': 0, '会心': 0, '调息': 0 };

  // 角色天生
  ATTR_TYPES.forEach(a => { result[a] += INNATE[a] || 0; });

  // 装备
  SLOTS.forEach(slot => {
    const cfg = state.equip && state.equip[slot.id];
    if (!cfg) return;
    calcSlotEntries(slot, cfg).forEach(({ attr, value }) => {
      result[attr] = (result[attr] || 0) + value;
    });
  });

  // 稀有护符额外 3×1500 (玩家只能佩戴 1 个稀有护符, 稀有功能集中在护符1)
  const hasRareAmulet = state.equip && state.equip.hufu1 && state.equip.hufu1.isRare;
  if (hasRareAmulet && state.rareAmulet && state.rareAmulet.extras) {
    state.rareAmulet.extras.forEach(a => {
      if (a && ATTR_TYPES.includes(a)) {
        result[a] += RARE_AMULET_EXTRA;
      }
    });
  }

  // 机巧盘
  if (state.jiqiao) {
    ATTR_TYPES.forEach(a => {
      const n = state.jiqiao[a] || 0;
      result[a] += n * JIQIAO_BLOCK;
    });
  }

  // 丹药 (单选: {attr, level})
  if (state.dan && state.dan.attr && state.dan.level && DAN[state.dan.level]) {
    result[state.dan.attr] += DAN[state.dan.level];
  }

  // 食物 (单选: {attr, level})
  if (state.food && state.food.attr && state.food.level && FOOD[state.food.level]) {
    result[state.food.attr] += FOOD[state.food.level];
  }

  // 符文
  if (state.rune) {
    ATTR_TYPES.forEach(a => {
      if (state.rune[a]) {
        Object.entries(state.rune[a]).forEach(([lvl, n]) => {
          if (n > 0 && RUNE[lvl]) result[a] += n * RUNE[lvl];
        });
      }
    });
  }

  // 四属性铭锋: 全部属性各加
  const mingAll = state.mingfengAll || 0;
  if (mingAll > 0) {
    ATTR_TYPES.forEach(a => { result[a] += mingAll; });
  }

  // 最高属性铭锋: 当前最高属性加 (在所有其他加成算完后取 max)
  const mingTop = state.mingfengTop || 0;
  if (mingTop > 0) {
    let maxAttr = ATTR_TYPES[0];
    let maxVal = result[maxAttr] || 0;
    ATTR_TYPES.forEach(a => {
      if ((result[a] || 0) > maxVal) {
        maxVal = result[a];
        maxAttr = a;
      }
    });
    result[maxAttr] += mingTop;
  }

  return result;
}

// 详细分项 (用于展示)
function calcDetail(state) {
  const detail = { '元御': [], '专精': [], '会心': [], '调息': [] };

  // 角色天生
  ATTR_TYPES.forEach(a => {
    if ((INNATE[a] || 0) > 0) detail[a].push(`角色天生 ${INNATE[a]}`);
  });

  // 装备
  SLOTS.forEach(slot => {
    const cfg = state.equip && state.equip[slot.id];
    if (!cfg) return;
    const entries = calcSlotEntries(slot, cfg);
    if (entries.length === 0) return;

    // 判断词条类型标签
    entries.forEach(({ attr, value }, i) => {
      let label;
      if (cfg.isRare) {
        label = '稀有词条';
      } else if (cfg.type === 'mid_mid') {
        label = '中词条';
      } else {
        // 大+小: 第一个是大, 第二个是小 (calcSlotEntries 顺序保证)
        label = i === 0 ? '大词条' : '小词条';
      }
      // 稀有装备不重复写属性名 (detail 已分类), 普通装备写"属性+值"
      const suffix = cfg.isRare ? `${value}` : `${attr}+${value}`;
      detail[attr].push(`${slot.name} ${label} ${suffix}`);
    });
  });

  // 稀有护符额外 3×1500
  const hasRareAmulet = state.equip && state.equip.hufu1 && state.equip.hufu1.isRare;
  if (hasRareAmulet && state.rareAmulet && state.rareAmulet.extras) {
    state.rareAmulet.extras.forEach((a, i) => {
      if (a && ATTR_TYPES.includes(a)) {
        detail[a].push(`稀有护符额外 #${i+1} +${RARE_AMULET_EXTRA}`);
      }
    });
  }

  // 机巧盘
  if (state.jiqiao) {
    ATTR_TYPES.forEach(a => {
      const n = state.jiqiao[a] || 0;
      if (n > 0) detail[a].push(`机巧盘 ${n}块 ×${JIQIAO_BLOCK} = ${n*JIQIAO_BLOCK}`);
    });
  }

  // 丹药
  if (state.dan && state.dan.attr && state.dan.level && DAN[state.dan.level]) {
    detail[state.dan.attr].push(`丹药[${state.dan.level}] +${DAN[state.dan.level]}`);
  }

  // 食物
  if (state.food && state.food.attr && state.food.level && FOOD[state.food.level]) {
    detail[state.food.attr].push(`食物[${state.food.level}] +${FOOD[state.food.level]}`);
  }

  // 符文
  if (state.rune) {
    ATTR_TYPES.forEach(a => {
      if (state.rune[a]) {
        Object.entries(state.rune[a]).forEach(([lvl, n]) => {
          if (n > 0 && RUNE[lvl]) detail[a].push(`符文[${lvl}] ${n}颗 ×${RUNE[lvl]} = ${n*RUNE[lvl]}`);
        });
      }
    });
  }

  return Object.fromEntries(ATTR_TYPES.map(a => [a, detail[a]]));
}
