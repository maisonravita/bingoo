// Les robots du QG : les cubes-robots du Bureau des agents (visière noire, yeux orange), avec un corps, des bras et
// l'accessoire de leur métier. Max, le chef, est le robot noir du logo à la cravate orange ; l'équipe est blanche :
// l'éclaireur a son hélice (il survole la ville), les lecteurs leur chapeau d'explorateur (ils vont voir chaque commerce),
// les rédacteurs leur crayon. Tout est dessiné en code, pose par pose, puis gardé en mémoire.
import { darken, g2d, lighten, makeCanvas, mirror, outline, P, px, rect } from './pixels.js';

export const ROLES = {
  chef: { label: 'Stratège', color: '#FF8A3D' },
  eclaireur: { label: 'Chercheur', color: '#FFC93D' },
  lecteur: { label: 'Enquêteur', color: '#4FB3FF' },
  redacteur: { label: 'Campagnes', color: '#A98BFF' },
  agent: { label: 'Équipe', color: '#3DDC97' },
};

/** Taille d'un sprite ; les pieds (le bas du contour) sont au point d'ancrage. */
export const ROBOT_W = 20;
export const ROBOT_H = 24;
export const ANCHOR_X = 10;
export const ANCHOR_Y = 22;

// L'équipe Bingoo! (les mêmes que dans « Ton équipe ») : la casquette orange, chacun son allure.
const CAP = '#F2652A';
export const LOOKS = {
  chef: { role: 'chef', skin: '#f2c6a0', hair: '#4a2c1d', style: 'long', body: '#8d8f99', pants: '#3a3a46' }, // Iris
  eclaireur: { role: 'eclaireur', skin: '#e8b48c', hair: '#2b1c14', style: 'short', beard: '#3a261b', body: '#2f3b57', pants: '#2a2a33' }, // Léo
  'lecteur-1': { role: 'lecteur', skin: '#a8714f', hair: '#1f1612', style: 'curly', body: '#eef0f4', pants: '#3b4256' }, // Sam
  'lecteur-2': { role: 'lecteur', skin: '#f1c7a5', hair: '#5a3a26', style: 'short', glasses: true, body: '#33405e', pants: '#2b2f3b' }, // Max
  'lecteur-3': { role: 'lecteur', skin: '#e9b993', hair: '#2a1a14', style: 'long', glasses: true, body: '#7a5236', pants: '#2f2a28' }, // Lina
  'redacteur-1': { role: 'redacteur', skin: '#d9a07a', hair: '#1c1410', style: 'short', beard: '#1c1410', body: '#2c3854', pants: '#24242c' }, // Hugo
  'redacteur-2': { role: 'redacteur', skin: '#f3cba8', hair: '#a8774a', style: 'long', body: '#4a4e5c', pants: '#2c2c35' }, // Inès
  paul: { role: 'agent', skin: '#c98c64', hair: '#1a1210', style: 'short', beard: '#1a1210', body: '#2e3a5a', pants: '#24242c' }, // Paul
  joueur: { role: 'agent', skin: '#f0c19c', hair: '#3b2416', style: 'short', body: '#E0531F', pants: '#1c1917' }, // toi (mode Jouer)
  oscar: { role: 'agent', skin: '#f0c4a0', hair: '#6a4a30', style: 'short', glasses: true, body: '#5a4636', pants: '#2c2a28' }, // Oscar
};

function lookOf(id) {
  const k = LOOKS[id] ?? LOOKS[`${id}-1`] ?? LOOKS['lecteur-1'];
  return {
    ...k, chef: k.role === 'chef',
    skinShade: darken(k.skin, 0.16), hairHi: lighten(k.hair, 0.18),
    bodyHi: lighten(k.body, 0.2), bodyShade: darken(k.body, 0.22),
    arm: k.body, hand: k.skin, leg: k.pants, tip: CAP,
  };
}

const EYE = '#21160f';

function drawEyes(g, L, eyes, y) {
  const ey = y + 6;
  for (const x of [7, 11]) {
    if (eyes === 'blink') rect(g, x, ey + 1, 2, 1, EYE);
    else if (eyes === 'happy') { rect(g, x, ey, 2, 1, EYE); px(g, x - 1 + (x === 7 ? 0 : 2), ey + 1, L.skinShade); }
    else {
      const ox = eyes === 'left' ? -1 : eyes === 'right' ? 1 : 0;
      rect(g, x + Math.max(0, ox), ey + (eyes === 'down' ? 1 : 0), 1, 2, EYE);
    }
  }
  if (L.glasses) { for (const x of [6, 10]) { rect(g, x, ey - 1, 4, 1, '#16120f'); rect(g, x, ey + 2, 4, 1, '#16120f'); px(g, x, ey, '#16120f'); px(g, x, ey + 1, '#16120f'); px(g, x + 3, ey, '#16120f'); px(g, x + 3, ey + 1, '#16120f'); } }
}

/** La casquette Bingoo! : orange, une petite marque blanche, la visière vers le regard. */
function drawCap(g, dir, y) {
  rect(g, 4, y, 12, 3, CAP);
  rect(g, 5, y - 1, 10, 1, CAP);
  rect(g, 5, y - 1, 8, 1, lighten(CAP, 0.25));
  if (dir === 'down') { rect(g, 3, y + 3, 14, 1, darken(CAP, 0.28)); rect(g, 8, y, 4, 1, '#ffffff'); }
  else if (dir === 'right') { rect(g, 10, y + 3, 8, 1, darken(CAP, 0.28)); rect(g, 11, y, 3, 1, '#ffffff'); }
  else rect(g, 4, y + 2, 12, 1, darken(CAP, 0.18));
}

function drawHead(g, L, dir, eyes, bob) {
  const y = 4 + bob;
  const long = L.style === 'long', curly = L.style === 'curly';
  if (dir === 'down') {
    // les cheveux derrière le visage (longs : jusqu'aux épaules)
    rect(g, 4, y + 2, 12, long ? 11 : curly ? 9 : 6, L.hair);
    if (curly) { for (const [x, yy] of [[3, 4], [16, 4], [3, 7], [16, 7]]) rect(g, x, y + yy, 1, 2, L.hair); }
    rect(g, 5, y + 3, 10, 7, L.skin);
    rect(g, 14, y + 3, 1, 7, L.skinShade);
    rect(g, 5, y + 3, 10, 1, L.hair); // la frange sous la casquette
    drawEyes(g, L, eyes, y);
    if (L.beard) { rect(g, 5, y + 8, 10, 2, L.beard); rect(g, 6, y + 10, 8, 1, L.beard); rect(g, 9, y + 8, 2, 1, darken(L.skin, 0.35)); }
    else rect(g, 9, y + 8, 2, 1, darken(L.skin, 0.3));
  } else if (dir === 'up') {
    rect(g, 4, y + 2, 12, long ? 11 : curly ? 9 : 8, L.hair);
    rect(g, 5, y + 3, 10, 1, L.hairHi);
  } else {
    rect(g, 4, y + 2, 7, long ? 11 : curly ? 9 : 7, L.hair);
    rect(g, 8, y + 3, 8, 7, L.skin);
    rect(g, 8, y + 3, 2, 3, L.hair);
    px(g, 9, y + 6, L.skinShade); // l'oreille
    if (eyes === 'blink' || eyes === 'happy') rect(g, 13, y + 7, 2, 1, EYE); else rect(g, 13, y + 6, 1, 2, EYE);
    if (L.glasses) { rect(g, 12, y + 5, 4, 1, '#16120f'); rect(g, 12, y + 8, 4, 1, '#16120f'); px(g, 15, y + 6, '#16120f'); px(g, 15, y + 7, '#16120f'); }
    if (L.beard) { rect(g, 10, y + 8, 6, 2, L.beard); rect(g, 11, y + 10, 4, 1, L.beard); }
  }
  drawCap(g, dir, y);
}

function drawAntenna() { /* pas d'antenne : ce sont des humains */ }

/** Les accessoires : l'hélice de Léo (il survole la ville), le carnet des enquêteurs, le crayon des rédacteurs. */
function drawAccessory(g, L, dir, bob, frame) {
  const y = bob;
  switch (L.role) {
    case 'redacteur': {
      if (dir === 'down') { px(g, 16, 5 + y, '#ff8fb1'); rect(g, 16, 6 + y, 1, 4, '#ffd166'); px(g, 16, 10 + y, '#3a3547'); }
      break;
    }
    case 'eclaireur': {
      rect(g, 9, 1 + y, 2, 2, '#3a3547');
      if (frame % 2 === 0) rect(g, 2, 0 + y, 16, 1, '#e8e5f1');
      else rect(g, 6, 0 + y, 8, 1, '#c4bfd4');
      break;
    }
  }
}

function drawBodyFront(g, L, dir, limbs, bob, seated) {
  const y = 14 + bob;
  if (!seated) {
    rect(g, 7, 19, 2, 3 - limbs.ll, L.leg);
    rect(g, 11, 19, 2, 3 - limbs.rl, L.leg);
  }
  rect(g, 6, y, 8, 5, L.body);
  rect(g, 6, y, 8, 1, L.bodyHi);
  rect(g, 6, y + 4, 8, 1, L.bodyShade);
  rect(g, 13, y + 1, 1, 3, L.bodyShade);
  if (dir === 'down') { rect(g, 9, y, 2, 1, L.skin); px(g, 7, y + 2, CAP); } // le cou, le petit badge Bingoo!
  for (const [x, ay, h] of [limbs.la, limbs.ra]) {
    rect(g, x, ay + bob, 2, h, L.arm);
    rect(g, x, ay + bob + h - 1, 2, 1, L.hand);
  }
}

function drawBodySide(g, L, frame, walking, bob, pose) {
  const y = 14 + bob;
  const swing = walking ? [0, 1, 0, -1][frame % 4] : 0;
  if (pose === 'fly') {
    rect(g, 8, 19, 2, 2, darken(L.leg, 0.15));
    rect(g, 10, 19, 2, 2, L.leg);
  } else {
    rect(g, 8 + swing, 19, 2, 3, darken(L.leg, 0.15));
    rect(g, 10 - swing, 19, 2, 3, L.leg);
  }
  rect(g, 7, y, 7, 5, L.body);
  rect(g, 7, y, 7, 1, L.bodyHi);
  rect(g, 7, y + 4, 7, 1, L.bodyShade);
  if (pose === 'carry') {
    // la lettre tenue devant lui
    rect(g, 12, y, 5, 4, P.paper);
    rect(g, 12, y, 5, 1, P.paperShade);
    px(g, 14, y + 1, P.paperLine);
    rect(g, 11, y + 1, 3, 2, L.arm);
  } else if (pose === 'fly') {
    rect(g, 9, y + 1, 5, 2, L.arm);
    rect(g, 13, y + 1, 1, 2, L.hand);
  } else {
    rect(g, 9 - swing, y + 1, 2, 4, L.arm);
    rect(g, 9 - swing, y + 4, 2, 1, L.hand);
  }
}

function limbsFor(pose, frame) {
  const f = frame % 4;
  switch (pose) {
    case 'walk':
      return { la: [4, 14 + (f === 1 ? 1 : f === 3 ? -1 : 0), 4], ra: [14, 14 + (f === 1 ? -1 : f === 3 ? 1 : 0), 4], ll: f === 1 ? 1 : 0, rl: f === 3 ? 1 : 0 };
    case 'type':
      return { la: [5, 16 - (frame % 2 === 0 ? 1 : 0), 3], ra: [13, 16 - (frame % 2 === 1 ? 1 : 0), 3], ll: 0, rl: 0 };
    case 'read':
      return { la: [5, 16, 3], ra: [13, 16, 3], ll: 0, rl: 0 };
    case 'think':
      return { la: [4, 14, 4], ra: [13, 11, 4], ll: 0, rl: 0 };
    case 'raise':
      return { la: [4, 14, 4], ra: [15, 2 + (frame % 2), 6], ll: 0, rl: 0 };
    case 'cheer':
      return { la: [3, 3 + (frame % 2), 6], ra: [15, 3 + ((frame + 1) % 2), 6], ll: frame % 2, rl: (frame + 1) % 2 };
    case 'wave':
      return { la: [4, 14, 4], ra: [15 + (frame % 2), 4, 6], ll: 0, rl: 0 };
    case 'fly':
      return { la: [2, 13 + (frame % 2), 3], ra: [16, 13 + ((frame + 1) % 2), 3], ll: 1, rl: 1 };
    case 'carry':
      return { la: [5, 15, 3], ra: [13, 15, 3], ll: 0, rl: 0 };
    default:
      return { la: [4, 14, 4], ra: [14, 14, 4], ll: 0, rl: 0 };
  }
}

function build(id, pose, dir, frame, eyes) {
  const L = lookOf(id);
  if (dir === 'left') return mirror(build(id, pose, 'right', frame, eyes));
  const c = makeCanvas(ROBOT_W, ROBOT_H);
  const g = g2d(c);
  const walking = pose === 'walk';
  const f = frame % 4;
  const bob = walking ? (f === 1 || f === 3 ? -1 : 0) : pose === 'cheer' ? -(frame % 2) : pose === 'fly' ? (frame % 4 < 2 ? 0 : -1) : 0;
  const hatted = true;
  if (dir === 'right') {
    drawBodySide(g, L, frame, walking, bob, pose);
    if (!hatted) drawAntenna(g, L, bob);
    drawHead(g, L, 'right', eyes, bob);
    drawAccessory(g, L, 'right', bob, frame);
  } else {
    const limbs = limbsFor(pose, frame);
    drawBodyFront(g, L, dir, limbs, bob, false);
    if (!hatted) drawAntenna(g, L, bob);
    drawHead(g, L, dir, eyes, bob);
    drawAccessory(g, L, dir, bob, frame);
    if (pose === 'carry' && dir === 'down') {
      // la lettre, tenue à deux mains devant le ventre
      rect(g, 6, 15 + bob, 8, 5, P.paper);
      rect(g, 6, 15 + bob, 8, 1, P.paperShade);
      px(g, 7, 16 + bob, P.paperLine); px(g, 12, 16 + bob, P.paperLine);
      rect(g, 8, 17 + bob, 4, 1, P.paperLine);
      px(g, 10, 18 + bob, P.orange);
      rect(g, 4, 16 + bob, 2, 2, L.hand);
      rect(g, 14, 16 + bob, 2, 2, L.hand);
    }
    if ((pose === 'raise' || pose === 'cheer' || pose === 'wave') && dir === 'down') {
      const [x, ay, h] = limbs.ra;
      if (x <= 15) { rect(g, x, ay + bob, 2, h, L.arm); rect(g, x, ay + bob, 2, 1, L.hand); }
      if (pose === 'cheer') { const [lx, ly, lh] = limbs.la; rect(g, lx, ly + bob, 2, lh, L.arm); rect(g, lx, ly + bob, 2, 1, L.hand); }
    }
  }
  outline(c, P.ink);
  return c;
}

const cache = new Map();

/** Le sprite d'un robot (gardé en mémoire : chaque pose n'est dessinée qu'une fois). */
export function robotSprite(role, pose, dir, frame, eyes = 'open') {
  const key = `${role}|${pose}|${dir}|${frame}|${eyes}`;
  let c = cache.get(key);
  if (!c) {
    c = build(role, pose, dir, frame, eyes);
    cache.set(key, c);
  }
  return c;
}

const PHOTOS = { chef: 'iris', eclaireur: 'leo', 'lecteur-1': 'sam', 'lecteur-2': 'max', 'lecteur-3': 'lina', 'redacteur-1': 'hugo', 'redacteur-2': 'ines', paul: 'paul', oscar: 'oscar' };
/** Le portrait d'un membre de l'équipe : la même photo que dans « Ton équipe » sur Bingoo!. */
export function portrait(id) {
  const img = document.createElement('img');
  img.src = `/salaries/${PHOTOS[id] ?? 'max'}.png`;
  img.alt = '';
  img.style.objectFit = 'cover';
  img.style.objectPosition = 'center 12%';
  return img;
}
