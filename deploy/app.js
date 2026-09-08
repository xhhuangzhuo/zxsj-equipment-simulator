// 装备属性模拟器 - UI 交互 + 状态管理

const STORAGE_KEY = 'zhuangbei_sim_v2';

// meta: 方案元数据 (所有方案 + 当前方案 id)
let meta = {
  plans: { 'plan1': null },
  currentPlan: 'plan1',
};

// state: 当前方案的扁平副本 (访问更方便, 切换方案时重新指向)
let state = null;

function getDefaultPlanData() {
  return {
    equip: {},
    jiqiao: { '元御': 0, '专精': 0, '会心': 0, '调息': 0 },
    rune: {
      '元御': { '顶': 0, '高': 0, '中': 0, '低': 0 },
      '专精': { '顶': 0, '高': 0, '中': 0, '低': 0 },
      '会心': { '顶': 0, '高': 0, '中': 0, '低': 0 },
      '调息': { '顶': 0, '高': 0, '中': 0, '低': 0 },
    },
    dan: null,
    food: null,
    rareAmulet: { extras: [null, null, null] },
    mingfengAll: 0,
    mingfengTop: 0,
  };
}

// 同步: 把 state 扁平副本存回 meta.plans[currentPlan]
function syncPlan() {
  if (!state) return;
  meta.plans[meta.currentPlan] = {
    equip: state.equip,
    jiqiao: state.jiqiao,
    rune: state.rune,
    dan: state.dan,
    food: state.food,
    rareAmulet: state.rareAmulet,
    mingfengAll: state.mingfengAll,
    mingfengTop: state.mingfengTop,
  };
}

// 加载某个方案到 state (扁平副本)
function loadPlan(planId) {
  const plan = meta.plans[planId] || getDefaultPlanData();
  meta.plans[planId] = plan;
  meta.currentPlan = planId;
  state = {
    equip: plan.equip || {},
    jiqiao: plan.jiqiao || { '元御': 0, '专精': 0, '会心': 0, '调息': 0 },
    rune: plan.rune || { '元御': { '顶': 0, '高': 0, '中': 0, '低': 0 }, '专精': { '顶': 0, '高': 0, '中': 0, '低': 0 }, '会心': { '顶': 0, '高': 0, '中': 0, '低': 0 }, '调息': { '顶': 0, '高': 0, '中': 0, '低': 0 } },
    dan: plan.dan !== undefined ? plan.dan : null,
    food: plan.food !== undefined ? plan.food : null,
    rareAmulet: plan.rareAmulet || { extras: [null, null, null] },
    mingfengAll: plan.mingfengAll || 0,
    mingfengTop: plan.mingfengTop || 0,
  };
}

function getDefaultEquipCfg(slot) {
  return {
    level: 550,
    type: slot.group === 'WEAPON' ? 'mid_mid' : 'big_small',
    attrs: ['元御', '专精'],
    enhance: 10,
    isRare: false,
  };
}

function initState() {
  if (!state) return;
  SLOTS.forEach(slot => {
    if (!state.equip[slot.id]) {
      state.equip[slot.id] = getDefaultEquipCfg(slot);
    }
  });
  fixAttrs();
}

// 修正老 localStorage 数据
function fixAttrs() {
  if (!state || !state.equip) return;
  SLOTS.forEach(slot => {
    const cfg = state.equip[slot.id];
    if (!cfg) return;
    if (cfg.isRare) return;
    if (slot.group === 'WEAPON') {
      cfg.type = 'mid_mid';
    } else if (cfg.type === 'weapon_same') {
      cfg.type = 'big_small';
    }
    if (!Array.isArray(cfg.attrs) || cfg.attrs.length < 2) {
      cfg.attrs = ['元御', '专精'];
    }
    if (cfg.attrs[0] === cfg.attrs[1]) {
      cfg.attrs[1] = ATTR_TYPES.find(a => a !== cfg.attrs[0]) || '专精';
    }
  });
}

function loadState() {
  try {
    let saved = localStorage.getItem(STORAGE_KEY);
    // v1 → v2 迁移: 老 key 'zhuangbei_sim_v1' 的数据迁移到 plan1
    if (!saved) {
      const oldSaved = localStorage.getItem('zhuangbei_sim_v1');
      if (oldSaved) {
        try {
          const oldLoaded = JSON.parse(oldSaved);
          meta.plans = { 'plan1': Object.assign(getDefaultPlanData(), oldLoaded) };
          meta.currentPlan = 'plan1';
          // 写入新 key, 删除老 key
          localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
          localStorage.removeItem('zhuangbei_sim_v1');
          saved = localStorage.getItem(STORAGE_KEY);
        } catch (e) {}
      }
    }
    if (saved) {
      const loaded = JSON.parse(saved);
      if (loaded.plans) {
        // 新格式 (v2): 多方案
        meta.plans = loaded.plans;
        meta.currentPlan = loaded.currentPlan || Object.keys(meta.plans)[0] || 'plan1';
      } else {
        // 老格式 (v1, 同 key 内的扁平结构): 单一配置, 迁移为 plan1
        meta.plans = { 'plan1': Object.assign(getDefaultPlanData(), loaded) };
        meta.currentPlan = 'plan1';
      }
    } else {
      meta.plans = { 'plan1': getDefaultPlanData() };
      meta.currentPlan = 'plan1';
    }
  } catch (e) {
    console.error('加载配置失败', e);
    meta.plans = { 'plan1': getDefaultPlanData() };
    meta.currentPlan = 'plan1';
  }
  // 确保 currentPlan 存在
  if (!meta.plans[meta.currentPlan]) {
    const ids = Object.keys(meta.plans);
    meta.currentPlan = ids[0] || 'plan1';
    if (!meta.plans[meta.currentPlan]) {
      meta.plans[meta.currentPlan] = getDefaultPlanData();
    }
  }
  loadPlan(meta.currentPlan);
  initState();
  syncPlan();
}

function saveState() {
  try {
    syncPlan();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    flashMsg('已保存 ✓');
  } catch (e) {
    flashMsg('保存失败 ✗', true);
  }
}

function saveStateSilent() {
  try {
    syncPlan();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch (e) {}
}

// 重置本页 (只重置当前方案, 不影响其他方案)
function resetState() {
  if (!confirm('确定要重置本方案 (' + meta.currentPlan + ') 的配置吗? 此操作不可恢复, 不影响其他方案。')) return;
  meta.plans[meta.currentPlan] = getDefaultPlanData();
  loadPlan(meta.currentPlan);
  initState();
  syncPlan();
  saveStateSilent();
  renderAll();
  calcAndShow();
  flashMsg('本方案已重置 ✓');
}

// === 方案管理 ===
function setCurrentPlan(planId) {
  if (planId === meta.currentPlan) return;
  syncPlan();  // 先保存当前方案
  loadPlan(planId);
  initState();
  saveStateSilent();
  renderAll();
  calcAndShow();
  renderPlanToolbar();
}

function newPlan() {
  syncPlan();
  let n = 1;
  while (meta.plans['plan' + n]) n++;
  const newId = 'plan' + n;
  // 复制当前方案作为新方案 (方便微调)
  meta.plans[newId] = JSON.parse(JSON.stringify(meta.plans[meta.currentPlan]));
  loadPlan(newId);
  initState();
  saveStateSilent();
  renderAll();
  calcAndShow();
  renderPlanToolbar();
  flashMsg('已新建 ' + newId + ' (复制当前方案) ✓');
}

// 重命名当前方案
function renamePlan() {
  const newName = prompt('输入新方案名:', meta.currentPlan);
  if (!newName || newName === meta.currentPlan) return;
  if (meta.plans[newName]) {
    alert('方案名已存在: ' + newName + '\n请换一个名字');
    return;
  }
  // 检查名字合法 (避免特殊字符)
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\-]+$/.test(newName)) {
    alert('名字只能包含中文/英文/数字/下划线/连字符');
    return;
  }
  meta.plans[newName] = meta.plans[meta.currentPlan];
  delete meta.plans[meta.currentPlan];
  meta.currentPlan = newName;
  syncPlan();
  saveStateSilent();
  renderPlanToolbar();
  flashMsg('已重命名为 ' + newName + ' ✓');
}

function deletePlan() {
  const planIds = Object.keys(meta.plans);
  if (planIds.length <= 1) {
    flashMsg('至少保留 1 个方案 ✗', true);
    return;
  }
  if (!confirm('确定要删除方案 ' + meta.currentPlan + ' 吗? 此操作不可恢复。')) return;
  const delId = meta.currentPlan;
  delete meta.plans[delId];
  const nextId = Object.keys(meta.plans)[0];
  loadPlan(nextId);
  initState();
  saveStateSilent();
  renderAll();
  calcAndShow();
  renderPlanToolbar();
  flashMsg('已删除 ' + delId + ', 切换到 ' + nextId + ' ✓');
}

function exportPlans() {
  syncPlan();
  const data = JSON.stringify({
    plans: meta.plans,
    currentPlan: meta.currentPlan,
    exportedAt: new Date().toISOString(),
    version: 2,
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zhuangbei_plans_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  flashMsg('已导出 ✓');
}

function importPlans() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.plans) throw new Error('文件格式错误 (缺 plans)');
        meta.plans = data.plans;
        meta.currentPlan = data.currentPlan || Object.keys(meta.plans)[0] || 'plan1';
        if (!meta.plans[meta.currentPlan]) {
          meta.currentPlan = Object.keys(meta.plans)[0] || 'plan1';
          if (!meta.plans[meta.currentPlan]) meta.plans[meta.currentPlan] = getDefaultPlanData();
        }
        loadPlan(meta.currentPlan);
        initState();
        saveStateSilent();
        renderAll();
        calcAndShow();
        renderPlanToolbar();
        flashMsg('已导入 ' + Object.keys(meta.plans).length + ' 个方案 ✓');
      } catch (err) {
        flashMsg('导入失败: ' + err.message + ' ✗', true);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function renderPlanToolbar() {
  const sel = document.getElementById('plan-sel');
  if (!sel) return;
  const planIds = Object.keys(meta.plans);
  sel.innerHTML = planIds.map(id =>
    `<option value="${id}" ${id === meta.currentPlan ? 'selected' : ''}>${id}</option>`
  ).join('');
  const delBtn = document.getElementById('btn-del-plan');
  if (delBtn) delBtn.disabled = planIds.length <= 1;
}

function flashMsg(msg, isError) {
  const titleEl = document.querySelector('.header h1');
  if (!titleEl) return;
  const old = titleEl.dataset.original || titleEl.textContent;
  titleEl.dataset.original = old;
  titleEl.textContent = msg;
  titleEl.style.color = isError ? '#ff6a6a' : '#a0e8a0';
  setTimeout(() => {
    titleEl.textContent = old;
    titleEl.style.color = '';
  }, 1500);
}

// === 渲染 ===
function renderAll() {
  renderEquipLeft();
  renderEquipRight();
  renderJiqiao();
  renderRune();
  renderDan();
  renderFood();
  renderRareExtra();
  renderMingfeng();
}

function renderEquipLeft() {
  const container = document.getElementById('left-equip');
  const slots = SLOTS.filter(s => s.side === 'left').sort((a, b) => a.order - b.order);
  container.innerHTML = slots.map(renderEquipCard).join('');
  bindEquipEvents(slots);
}

function renderEquipRight() {
  const container = document.getElementById('right-equip');
  const slots = SLOTS.filter(s => s.side === 'right').sort((a, b) => a.order - b.order);
  container.innerHTML = slots.map(renderEquipCard).join('');
  bindEquipEvents(slots);
}

function renderEquipCard(slot) {
  const cfg = state.equip[slot.id] || getDefaultEquipCfg(slot);
  if (!state.equip[slot.id]) state.equip[slot.id] = cfg;
  const isWeapon = slot.group === 'WEAPON';
  const canRare = slot.canRare;

  // 武器 540-570 (7 档), 其他装备 550/560/565/570 (4 档), 护符2 额外 575/580 (6 档), 护符1 扩展到 530-570 (9 档)
  const levelList = isWeapon
    ? ['540', '545', '550', '555', '560', '565', '570']
    : (slot.id === 'hufu1'
        ? ['530', '535', '540', '545', '550', '555', '560', '565', '570']
        : (slot.id === 'hufu2'
            ? ['550', '560', '565', '570', '575', '580']
            : ['550', '560', '565', '570']));
  const levelOpts = levelList.map(l =>
    `<option value="${l}" ${cfg.level == l ? 'selected' : ''}>${l}</option>`
  ).join('');

  const typeOpts = isWeapon ? '' :
    `<option value="big_small" ${cfg.type === 'big_small' ? 'selected' : ''}>大+小</option>
     <option value="mid_mid" ${cfg.type === 'mid_mid' ? 'selected' : ''}>中+中</option>`;

  const attrOpts = ATTR_TYPES.map(a => `<option value="${a}">${a}</option>`).join('');

  // 计算词条数 + 每个下拉是否 disabled
  let attrCount = 0;
  let attrDisabled = [];
  if (cfg.isRare && canRare) {
    if (slot.id === 'hufu1') {
      // 稀有护符: 4 个全 disabled (固定 222×4, 4 元御)
      attrCount = 4;
      attrDisabled = [true, true, true, true];
    } else if (slot.id === 'xl' || slot.id === 'ling') {
      // 稀有项链/令牌: 1 个 enabled (3 同属性联动)
      attrCount = 1;
      attrDisabled = [false];
    } else if (slot.id === 'fa') {
      // 稀有法印: 大=元御灰, 小1 限制非元御, 小2=元御灰
      attrCount = 3;
      attrDisabled = [true, false, true];
    }
  } else {
    // 普通装备 (含武器) = 2 个不同类型下拉
    attrCount = 2;
    attrDisabled = [false, false];
  }

  let attrCells = '';
  for (let i = 0; i < attrCount; i++) {
    const dis = attrDisabled[i] ? 'disabled' : '';
    attrCells += `<div class="equip-attr-cell">
      <span class="label">词条${i+1}</span>
      <select class="attr-sel" data-idx="${i}" ${dis}>${attrOpts}</select>
    </div>`;
  }

  let rareRow = '';
  if (canRare) {
    rareRow = `<div class="equip-row">
      <label class="rare-label"><input type="checkbox" class="rare-cb" ${cfg.isRare ? 'checked' : ''}> 稀有</label>
    </div>`;
  }

  const preview = computePreview(slot, cfg);

  return `<div class="equip-card" data-slot="${slot.id}">
    <div class="equip-icon">${slot.name}</div>
    <div class="equip-info">
      <div class="equip-name">${slot.name}</div>
      <div class="equip-row">
        <label>装等</label>
        <select class="level-sel">${levelOpts}</select>
        <label style="margin-left:4px">强化</label>
        <input type="number" class="enhance-inp" min="0" max="16" value="${cfg.enhance}">
      </div>
      ${isWeapon ? '' : `<div class="equip-row">
        <label>类型</label>
        <select class="type-sel">${typeOpts}</select>
      </div>`}
      <div class="equip-attrs">${attrCells}</div>
      ${rareRow}
      <div class="equip-row preview-row" style="font-size:10px;color:#7a9a7a;margin-top:4px;font-family:monospace">
        ${preview}
      </div>
    </div>
  </div>`;
}

function computePreview(slot, cfg) {
  try {
    const entries = calcSlotEntries(slot, cfg);
    if (entries.length === 0) return '—';
    return entries.map(e => `${e.attr}+${e.value}`).join(' / ');
  } catch (e) {
    return '计算错误';
  }
}

function bindEquipEvents(slots) {
  slots.forEach(slot => {
    const card = document.querySelector(`.equip-card[data-slot="${slot.id}"]`);
    if (!card) return;
    const cfg = state.equip[slot.id];

    card.querySelector('.level-sel')?.addEventListener('change', e => {
      cfg.level = parseInt(e.target.value);
      saveStateSilent();
      updatePreview(slot);
      calcAndShow();
    });

    if (!slot.group || slot.group !== 'WEAPON') {
      card.querySelector('.type-sel')?.addEventListener('change', e => {
        cfg.type = e.target.value;
        // 大+小/中中 都是 2 个不同类型下拉, 保持 attrs 长度 2
        if (cfg.attrs.length < 2) {
          cfg.attrs.push(cfg.attrs[0] === '元御' ? '专精' : '元御');
        }
        // 防御: 不重复
        if (cfg.attrs[0] === cfg.attrs[1]) {
          cfg.attrs[1] = ATTR_TYPES.find(a => a !== cfg.attrs[0]) || '专精';
        }
        saveStateSilent();
        renderEquipLeft();
        renderEquipRight();
        calcAndShow();
      });
    }

    card.querySelector('.enhance-inp')?.addEventListener('input', e => {
      let v = parseInt(e.target.value);
      if (isNaN(v)) v = 0;
      v = Math.max(0, Math.min(16, v));
      cfg.enhance = v;
      saveStateSilent();
      updatePreview(slot);
      calcAndShow();
    });

    card.querySelectorAll('.attr-sel').forEach(sel => {
      const idx = parseInt(sel.dataset.idx);
      if (cfg.attrs[idx]) sel.value = cfg.attrs[idx];
      sel.addEventListener('change', e => {
        let newVal = e.target.value;

        // 普通装备 (大+小/中中): 两词条不能重复
        if (!cfg.isRare && cfg.attrs.length >= 2 && idx < 2) {
          const otherIdx = idx === 0 ? 1 : 0;
          const otherVal = cfg.attrs[otherIdx];
          if (newVal === otherVal) {
            const others = ATTR_TYPES.filter(a => a !== otherVal);
            newVal = others[0];
            sel.value = newVal;
            flashMsg(`两词条不能重复, 已自动改为 ${newVal}`);
          }
        }

        // 稀有法印: 小1 (idx=1) 强制非元御
        if (cfg.isRare && slot.id === 'fa' && idx === 1) {
          if (newVal === '元御') {
            newVal = '专精';
            sel.value = newVal;
            flashMsg('法印稀有第 1 小不能是元御, 已自动改为专精');
          }
        }

        cfg.attrs[idx] = newVal;

        // 稀有项链/令牌: 1 个下拉联动, 数组保持 1 个
        if (cfg.isRare && (slot.id === 'xl' || slot.id === 'ling')) {
          cfg.attrs = [newVal];
          saveStateSilent();
          renderEquipLeft();
          renderEquipRight();
          calcAndShow();
        } else {
          saveStateSilent();
          updatePreview(slot);
          calcAndShow();
        }
      });
    });

    card.querySelector('.rare-cb')?.addEventListener('change', e => {
      cfg.isRare = e.target.checked;
      if (cfg.isRare) {
        // 勾选稀有: 设置对应的默认 attrs
        if (slot.id === 'hufu1') {
          // 4 个不同属性 (与计算层一致)
          cfg.attrs = ['元御', '专精', '会心', '调息'];
        } else if (slot.id === 'xl' || slot.id === 'ling') {
          cfg.attrs = ['元御'];
        } else if (slot.id === 'fa') {
          cfg.attrs = ['元御', '专精', '元御'];  // 大=元御, 小1=专精, 小2=元御
        }
      } else {
        // 取消稀有: 回到普通 2 个下拉
        if (cfg.attrs.length < 2) {
          cfg.attrs = ['元御', '专精'];
        }
      }
      saveStateSilent();
      renderEquipLeft();
      renderEquipRight();
      calcAndShow();
    });
  });
}

function updatePreview(slot) {
  const card = document.querySelector(`.equip-card[data-slot="${slot.id}"]`);
  if (!card) return;
  const cfg = state.equip[slot.id];
  const preview = computePreview(slot, cfg);
  const row = card.querySelector('.preview-row');
  if (row) row.textContent = preview;
}

// 机巧盘
function renderJiqiao() {
  const container = document.getElementById('jiqiao-input');
  container.innerHTML = '<div class="sys-row">' + ATTR_TYPES.map(a => `
    <div class="item">
      <label>${a}</label>
      <input type="number" class="jiqiao-inp" data-attr="${a}" min="0" max="9" value="${state.jiqiao[a] || 0}">
    </div>
  `).join('') + '</div>';

  container.querySelectorAll('.jiqiao-inp').forEach(inp => {
    inp.addEventListener('input', e => {
      const a = inp.dataset.attr;
      let v = parseInt(inp.value);
      if (isNaN(v)) v = 0;
      v = Math.max(0, v);
      state.jiqiao[a] = v;
      updateJiqiaoSum();
      saveStateSilent();
      calcAndShow();
    });
  });
  updateJiqiaoSum();
}

function updateJiqiaoSum() {
  const total = ATTR_TYPES.reduce((s, a) => s + (state.jiqiao[a] || 0), 0);
  const sumEl = document.getElementById('jiqiao-sum');
  if (sumEl) {
    sumEl.textContent = total;
    const tipEl = sumEl.parentElement;
    if (tipEl) tipEl.classList.toggle('over', total > 9);
  }
}

// 符文
function renderRune() {
  const container = document.getElementById('rune-input');
  const lvls = Object.keys(RUNE);
  let html = '<table class="matrix-table"><thead><tr><th></th>';
  ATTR_TYPES.forEach(a => html += `<th>${a}</th>`);
  html += '</tr></thead><tbody>';
  lvls.forEach(lvl => {
    html += `<tr><th>${lvl} (${RUNE[lvl]})</th>`;
    ATTR_TYPES.forEach(a => {
      const v = (state.rune[a] && state.rune[a][lvl]) || 0;
      html += `<td><input type="number" class="rune-inp" data-attr="${a}" data-lvl="${lvl}" min="0" max="9" value="${v}"></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;

  container.querySelectorAll('.rune-inp').forEach(inp => {
    inp.addEventListener('input', e => {
      const a = inp.dataset.attr;
      const l = inp.dataset.lvl;
      let v = parseInt(inp.value);
      if (isNaN(v)) v = 0;
      v = Math.max(0, v);
      if (!state.rune[a]) state.rune[a] = {};
      state.rune[a][l] = v;
      updateRuneSum();
      saveStateSilent();
      calcAndShow();
    });
  });
  updateRuneSum();
}

function updateRuneSum() {
  let total = 0;
  ATTR_TYPES.forEach(a => {
    if (state.rune[a]) {
      Object.values(state.rune[a]).forEach(v => total += v);
    }
  });
  const sumEl = document.getElementById('rune-sum');
  if (sumEl) {
    sumEl.textContent = total;
    const tipEl = sumEl.parentElement;
    if (tipEl) tipEl.classList.toggle('over', total > 9);
  }
}

// 丹药 (12 选 1)
function renderDan() {
  const container = document.getElementById('dan-input');
  const lvls = Object.keys(DAN);
  let html = '<table class="matrix-table"><thead><tr><th></th>';
  ATTR_TYPES.forEach(a => html += `<th>${a}</th>`);
  html += '</tr></thead><tbody>';
  lvls.forEach(lvl => {
    html += `<tr><th>${lvl} (${DAN[lvl]})</th>`;
    ATTR_TYPES.forEach(a => {
      const sel = state.dan && state.dan.attr === a && state.dan.level === lvl;
      html += `<td><input type="radio" name="dan-pick" class="dan-rb" data-attr="${a}" data-lvl="${lvl}" ${sel ? 'checked' : ''}></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;

  container.querySelectorAll('.dan-rb').forEach(rb => {
    rb.addEventListener('change', e => {
      if (e.target.checked) {
        state.dan = { attr: rb.dataset.attr, level: rb.dataset.lvl };
        saveStateSilent();
        calcAndShow();
      }
    });
  });
}

// 食物 (12 选 1)
function renderFood() {
  const container = document.getElementById('food-input');
  const lvls = Object.keys(FOOD);
  let html = '<table class="matrix-table"><thead><tr><th></th>';
  ATTR_TYPES.forEach(a => html += `<th>${a}</th>`);
  html += '</tr></thead><tbody>';
  lvls.forEach(lvl => {
    html += `<tr><th>${lvl} (${FOOD[lvl]})</th>`;
    ATTR_TYPES.forEach(a => {
      const sel = state.food && state.food.attr === a && state.food.level === lvl;
      html += `<td><input type="radio" name="food-pick" class="food-rb" data-attr="${a}" data-lvl="${lvl}" ${sel ? 'checked' : ''}></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;

  container.querySelectorAll('.food-rb').forEach(rb => {
    rb.addEventListener('change', e => {
      if (e.target.checked) {
        state.food = { attr: rb.dataset.attr, level: rb.dataset.lvl };
        saveStateSilent();
        calcAndShow();
      }
    });
  });
}

// 稀有护符额外
function renderRareExtra() {
  const container = document.getElementById('rare-extra');
  const attrOpts = '<option value="">无</option>' + ATTR_TYPES.map(a => `<option value="${a}">${a}</option>`).join('');
  let html = '<div class="sys-row">';
  for (let i = 0; i < 3; i++) {
    html += `<div class="item">
      <label>第 ${i+1} 条 (各 +${RARE_AMULET_EXTRA})</label>
      <select class="rare-extra-sel" data-idx="${i}">${attrOpts}</select>
    </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
  container.querySelectorAll('.rare-extra-sel').forEach(sel => {
    sel.value = state.rareAmulet.extras[parseInt(sel.dataset.idx)] || '';
    sel.addEventListener('change', e => {
      const idx = parseInt(sel.dataset.idx);
      state.rareAmulet.extras[idx] = e.target.value || null;
      saveStateSilent();
      calcAndShow();
    });
  });
}

// 铭锋
function renderMingfeng() {
  const inpAll = document.getElementById('ming-all');
  const inpTop = document.getElementById('ming-top');
  if (inpAll) {
    inpAll.value = state.mingfengAll || 0;
    inpAll.oninput = (e) => {
      let v = parseInt(e.target.value);
      if (isNaN(v)) v = 0;
      v = Math.max(0, v);
      state.mingfengAll = v;
      saveStateSilent();
      calcAndShow();
    };
  }
  if (inpTop) {
    inpTop.value = state.mingfengTop || 0;
    inpTop.oninput = (e) => {
      let v = parseInt(e.target.value);
      if (isNaN(v)) v = 0;
      v = Math.max(0, v);
      state.mingfengTop = v;
      saveStateSilent();
      calcAndShow();
    };
  }
}

// === 计算 + 渲染结果 ===
function calcAndShow() {
  const result = calcAll(state);
  const detail = calcDetail(state);

  const container = document.getElementById('result-table');
  container.innerHTML = ATTR_TYPES.map(a => {
    const val = result[a] || 0;
    const detailHtml = detail[a] && detail[a].length > 0
      ? detail[a].map(d => `<div>• ${d}</div>`).join('')
      : '<div style="color:#444">无加成</div>';
    return `<div class="result-cell">
      <div class="result-attr">${a}</div>
      <div class="result-val">${val.toLocaleString()} (${Math.round(val / 400)}%)</div>
      <div class="result-detail">${detailHtml}</div>
    </div>`;
  }).join('');
}

// === 启动 ===
function bindButtons() {
  document.getElementById('btn-calc').addEventListener('click', () => {
    calcAndShow();
    flashMsg('已重新计算 ✓');
    document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('btn-save').addEventListener('click', saveState);
  document.getElementById('btn-reset').addEventListener('click', resetState);
  document.getElementById('plan-sel').addEventListener('change', e => setCurrentPlan(e.target.value));
  document.getElementById('btn-new-plan').addEventListener('click', newPlan);
  document.getElementById('btn-rename-plan').addEventListener('click', renamePlan);
  document.getElementById('btn-del-plan').addEventListener('click', deletePlan);
  document.getElementById('btn-export').addEventListener('click', exportPlans);
  document.getElementById('btn-import').addEventListener('click', importPlans);
}

function init() {
  loadState();
  initState();
  renderPlanToolbar();
  renderAll();
  bindButtons();
  calcAndShow();
}

document.addEventListener('DOMContentLoaded', init);
