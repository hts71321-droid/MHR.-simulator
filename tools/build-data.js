/* =====================================================================
   index.html の const DATA = { … }; の中身を作り直すスクリプト
   ---------------------------------------------------------------------
   ゲームのアップデートで防具やスキルが変わったときに使います。

     git clone --depth 1 https://github.com/LartTyler/mhdb-wilds-data /tmp/mhdb
     node tools/build-data.js /tmp/mhdb/output/merged > /tmp/data-block.txt

   出力された中身を、index.html の const DATA = { と }; の間に貼り替えてください。
   （SERIES_SKILLS / GROUP_SKILLS はこのスクリプトでは触りません。
     シリーズ名・グループ名がキーと一致しているかだけ、末尾で照合します）
   ===================================================================== */
/* mhdb-wilds-data の抽出データから index.html の DATA ブロックを組み立てる */
const fs = require('fs');
const D = (process.argv[2] || './output/merged').replace(/\/?$/, '/');
const J = f => JSON.parse(fs.readFileSync(D + f, 'utf8'));

const skills = J('Skill.json');
const byId = {};
skills.forEach(s => byId[String(s.game_id)] = s);
const isBonus = id => { const s = byId[String(id)]; return s && (s.kind === 'set' || s.kind === 'group'); };
const nameOf  = id => { const s = byId[String(id)]; return s ? s.names.ja : ''; };
const clean = t => (t || '').replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim();

/* ---- 通常スキル（防具スキル＋武器スキル）---- */
const outSkills = {};
skills.filter(s => s.kind === 'armor' || s.kind === 'weapon').forEach(s => {
  const ranks = (s.ranks || []).slice().sort((a, b) => a.level - b.level);
  outSkills[s.names.ja] = { max: ranks.length, levels: ranks.map(r => clean(r.descriptions ? r.descriptions.ja : r.ja)) };
});

/* ---- 防具 ---- */
const KIND = { head: 'head', chest: 'body', arms: 'arms', waist: 'waist', legs: 'legs' };
const armors = { head: [], body: [], arms: [], waist: [], legs: [] };
const warn = [];
J('Armor.json').forEach(set => {
  const series = set.set_bonus_id ? nameOf(set.set_bonus_id) : '';
  const group  = set.group_bonus_id ? nameOf(set.group_bonus_id) : '';
  (set.pieces || []).forEach(pc => {
    const slot = KIND[pc.kind];
    if (!slot) { warn.push('未知の部位: ' + pc.kind + ' / ' + pc.names.ja); return; }
    const sk = {};
    for (const id in (pc.skills || {})) {
      if (isBonus(id)) continue;                 /* シリーズ／グループは部位スキルに混ぜない */
      const n = nameOf(id);
      if (!n) { warn.push('名前不明のスキルID: ' + id + ' / ' + pc.names.ja); continue; }
      sk[n] = pc.skills[id];
    }
    armors[slot].push({
      name: pc.names.ja,
      def: pc.defense ? pc.defense.base : 0,
      defMax: pc.defense ? pc.defense.max : 0,
      rare: set.rarity || 0,
      slots: pc.slots || [],
      skills: sk,
      series, group
    });
  });
});

/* ---- 装飾品 ---- */
const decos = J('Accessory.json').map(a => {
  const sk = {};
  for (const id in (a.skills || {})) { const n = nameOf(id); if (n) sk[n] = a.skills[id]; }
  return { name: a.names.ja, size: a.level || 1, on: a.allowed_on || 'armor', rare: a.rarity || 0, skills: sk };
}).filter(d => Object.keys(d.skills).length);

/* ---- 護石（お守り）---- */
const charms = [];
J('Amulet.json').forEach(am => (am.ranks || []).forEach(r => {
  const sk = {};
  for (const id in (r.skills || {})) { const n = nameOf(id); if (n) sk[n] = r.skills[id]; }
  if (!Object.keys(sk).length) return;
  charms.push({ name: r.names.ja, rare: r.rarity || 0, skills: sk });
}));


/* ---- 武器 ---- */
const WKIND = {
  'great-sword':'大剣','long-sword':'太刀','sword-shield':'片手剣','dual-blades':'双剣',
  'hammer':'ハンマー','hunting-horn':'狩猟笛','lance':'ランス','gunlance':'ガンランス',
  'switch-axe':'スラッシュアックス','charge-blade':'チャージアックス','insect-glaive':'操虫棍',
  'light-bowgun':'ライトボウガン','heavy-bowgun':'ヘビィボウガン','bow':'弓'
};
const WFILE = ['GreatSword','LongSword','SwordShield','DualBlades','Hammer','HuntingHorn','Lance',
               'Gunlance','SwitchAxe','ChargeBlade','InsectGlaive','LightBowgun','HeavyBowgun','Bow'];
const ELEM_JA = {fire:'火',water:'水',thunder:'雷',ice:'氷',dragon:'龍'};
const STAT_JA = {poison:'毒',paralysis:'麻痺',sleep:'睡眠',blastblight:'爆破'};
/* 斬れ味は「一番先まで伸びている色」だけを持ちます（ゲージの絵は描かないので） */
const SHARP_ORDER = [['purple','紫'],['white','白'],['blue','青'],['green','緑'],['yellow','黄'],['orange','橙'],['red','赤']];

const weapons = [];
WFILE.forEach(f => {
  let list; try { list = J('weapons/' + f + '.json'); } catch (e) { warn.push('武器ファイルなし: ' + f); return; }
  const byId = {}; list.forEach(x => byId[x.game_id] = x);
  list.forEach(x => {
    const sk = {};
    for (const id in (x.skills || {})) { const n = nameOf(id); if (n) sk[n] = x.skills[id]; }
    let elem = '—', ev = 0;
    (x.specials || []).forEach(s => {
      const nm = s.kind === 'element' ? ELEM_JA[s.element] : STAT_JA[s.status];
      if (!nm) return;
      elem = elem === '—' ? nm : elem + '・' + nm;
      ev += s.raw || 0;
    });
    let sharp = '';
    if (x.sharpness) { const hit = SHARP_ORDER.find(([k]) => (x.sharpness[k] || 0) > 0); if (hit) sharp = hit[1]; }
    /* 強化でスロットが変わるかどうか（前の段階と比べる） */
    const prev = x.crafting && x.crafting.previous_id ? byId[x.crafting.previous_id] : null;
    const from = prev && JSON.stringify(prev.slots || []) !== JSON.stringify(x.slots || [])
      ? { name: prev.names.ja, slots: prev.slots || [] } : null;
    const w = {
      name: x.names.ja, type: WKIND[x.kind] || x.kind, rare: x.rarity || 0,
      atk: x.attack_raw || 0, aff: x.affinity || 0, def: x.defense || 0,
      elem, ev, slots: x.slots || [], skills: sk
    };
    if (sharp) w.sharp = sharp;
    if (from) w.from = from;
    weapons.push(w);
  });
});
/* 武器種の並び（ゲーム内の順）を保ったまま、中はレア度の高い順 */
const typeOrder = Object.values(WKIND);
weapons.sort((a, b) => typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) || b.rare - a.rare);

/* ---- 同じ防具の α / β / γ をひとまとめにした対応表 ----
   ゲーム内でスロットが変わるのはここです。
   防具強化（限界突破）で変わるのは防御力だけで、スロットは動きません。
   例: ダハディラヘルムα[1] / β[2,2] / γ[3,3]
   variants[部位名] = 同じ名前の別バージョンの配列（自分は含みません） */
const variants = {};
{
  const groups = {};
  J('Armor.json').forEach(set => (set.pieces || []).forEach(pc => {
    const m = pc.names.ja.match(/^(.*?)([α-ω])$/);   /* 末尾のギリシャ文字で束ねる */
    if (!m) return;
    const key = m[1] + '|' + pc.kind;
    (groups[key] = groups[key] || []).push(pc.names.ja);
  }));
  Object.values(groups).forEach(names => {
    if (names.length < 2) return;
    names.sort();
    names.forEach(n => { variants[n] = names.filter(x => x !== n); });
  });
}

/* ---- 並び順：レア度の高い順（同レアは元の並び＝シリーズごとのまとまりを保つ）---- */
Object.keys(armors).forEach(k => armors[k].sort((a, b) => b.rare - a.rare));
charms.sort((a, b) => b.rare - a.rare);
decos.sort((a, b) => a.size - b.size || a.name.localeCompare(b.name, 'ja'));

/* ---- 出力 ---- */
const q = s => JSON.stringify(s);
const oneLine = o => JSON.stringify(o);
const lines = [];
lines.push('  skills:{');
Object.keys(outSkills).forEach((n, i, a) => {
  lines.push('    ' + q(n) + ':' + oneLine(outSkills[n]) + (i < a.length - 1 ? ',' : ''));
});
lines.push('  },');
lines.push('  seriesSkills:SERIES_SKILLS,');
lines.push('  groupSkills:GROUP_SKILLS,');
lines.push('  weapons:[');
weapons.forEach((w, i, a) => lines.push('    ' + oneLine(w) + (i < a.length - 1 ? ',' : '')));
lines.push('  ],');
lines.push('  variants:' + oneLine(variants) + ',');
lines.push('  armors:{');
['head', 'body', 'arms', 'waist', 'legs'].forEach((k, ki) => {
  lines.push('    ' + k + ':[');
  armors[k].forEach((a, i, arr) => lines.push('      ' + oneLine(a) + (i < arr.length - 1 ? ',' : '')));
  lines.push('    ]' + (ki < 4 ? ',' : ''));
});
lines.push('  },');
lines.push('  charms:[');
charms.forEach((c, i, a) => lines.push('    ' + oneLine(c) + (i < a.length - 1 ? ',' : '')));
lines.push('  ],');
lines.push('  decos:[');
decos.forEach((d, i, a) => lines.push('    ' + oneLine(d) + (i < a.length - 1 ? ',' : '')));
lines.push('  ]');

process.stdout.write(lines.join('\n') + '\n');

const log = (...a) => console.error(...a);
log('通常スキル :', Object.keys(outSkills).length);
log('防具       :', ['head','body','arms','waist','legs'].map(k => k + ' ' + armors[k].length).join(' / '),
    '= 計', Object.values(armors).reduce((a, c) => a + c.length, 0));
log('装飾品     :', decos.length, '（武器スロ用', decos.filter(d=>d.on==='weapon').length,
    '／防具スロ用', decos.filter(d=>d.on==='armor').length, '）');
log('護石       :', charms.length);
log('武器       :', weapons.length, '（' + typeOrder.length + '武器種）');
log('α/β/γ対応 :', Object.keys(variants).length, '部位');
log('生成サイズ :', (lines.join('\n').length / 1024).toFixed(0) + 'KB');
if (warn.length) { log('\n注意:'); [...new Set(warn)].slice(0, 20).forEach(w => log(' -', w)); }

/* シリーズ名・グループ名が index.html のキーと一致しているかの照合 */
try {
  const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
  const keysOf = name => {
    const m = html.match(new RegExp('const ' + name + '=\\{([\\s\\S]*?)\\n\\};'));
    return m ? [...m[1].matchAll(/"([^"]+)":\{/g)].map(x => x[1]) : [];
  };
  const S = keysOf('SERIES_SKILLS'), G = keysOf('GROUP_SKILLS');
  const usedS = new Set(), usedG = new Set();
  Object.values(armors).flat().forEach(a => { if (a.series) usedS.add(a.series); if (a.group) usedG.add(a.group); });
  const missS = [...usedS].filter(x => !S.includes(x));
  const missG = [...usedG].filter(x => !G.includes(x));
  log('');
  log('SERIES_SKILLS 照合:', missS.length ? '不一致 ' + missS.join('・') : 'OK（' + S.length + '件）');
  log('GROUP_SKILLS  照合:', missG.length ? '不一致 ' + missG.join('・') : 'OK（' + G.length + '件）');
  if (missS.length || missG.length) log('→ index.html の SERIES_SKILLS / GROUP_SKILLS に、上の名前を足してください。');
} catch (e) { log('\n（index.html が見つからないので名前の照合は省略しました）'); }
