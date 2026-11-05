import { useEffect, useRef, useState } from 'react';
import type { CharacterJSON } from '../../services/save-parser/models/Character';
import type { AchievementJSON } from '../../services/save-parser/models/Achievement';
import { getCharacterUnlock } from '../../lib/character-unlocks';

// Crops, pivots and menu layers extracted from the vanilla .anm2 files.
const ANIMATIONS = [
  '01_Isaac', '02_Magdalene', '03_Cain', '04_Judas', '06_Bluebaby',
  '05_Eve', '07_Samson', '08_Azazel', '09_Lazarus', '10_Eden',
  '11_TheLost', '12_Lilith', '13_Keeper', '15_Apollyon',
  '16_TheForgotten', '17_Bethany', '18_JacobEsau',
];

// Perspective inferred from the supplied 1080p game reference, in the menu's
// 480x270 coordinate space. Atlas dimensions do not limit the wheel's radius.
function wheelPosition(index: number, selectedIndex: number, count: number) {
  const angle = (index - selectedIndex) / count * Math.PI * 2;
  const scale = 1 / (1.75 - 0.75 * Math.cos(angle));
  const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
  return {
    x: round(240 + 150 * Math.sin(angle) * scale),
    y: round(75 + (scale - 0.4) / 0.6 * 34),
    scale: round(scale),
  };
}

interface Frame {
  XCrop: number; YCrop: number; Width: number; Height: number;
  XPosition?: number; YPosition?: number; XPivot?: number; YPivot?: number;
  XScale?: number; YScale?: number; Rotation?: number;
  Visible: boolean; Delay: number; AlphaTint: number;
  contentBounds?: { x: number; y: number; width: number; height: number };
}

interface MenuEntry {
  layers: Layer[];
  portraits: Frame[];
  lockedHint?: Frame;
}

interface Layer {
  id: number; name: string; sheet: string; visible: boolean; frames: Frame[];
}

// Native sprite coordinates and anchors from the menu and portrait animations.
function menuFrame(values: Partial<Frame> & Pick<Frame, 'XCrop' | 'YCrop' | 'Width' | 'Height'>): Frame {
  return { XPosition: 0, YPosition: 0, XPivot: 0, YPivot: 0, XScale: 100, YScale: 100, Rotation: 0, Visible: true, Delay: 1, AlphaTint: 255, ...values };
}

const data: {
  normal: Record<string, MenuEntry>;
  tainted: Record<string, MenuEntry>;
  completion: Layer[];
  sheets: Record<string, { width: number; height: number }>;
} = {
  sheets: {"charactermenu.png":{"height":1064,"width":512},"charactermenualt.png":{"height":1064,"width":512},"completion_widget.png":{"height":384,"width":384}},
  normal: {
    "17_Bethany": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":464,"contentBounds":{"y":5,"x":3,"height":39,"width":42}}), menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":464,"contentBounds":{"y":5,"x":3,"height":39,"width":42}})],
      lockedHint: menuFrame({"XCrop":240,"Height":48,"YPivot":16,"Width":192,"YCrop":832,"XPosition":160,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":768,"Height":32,"XPivot":16,"XCrop":432,"contentBounds":{"x":8,"y":7,"width":66,"height":18}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":24,"YPosition":204,"YPivot":16,"XPosition":168,"YCrop":1029,"Height":29,"XPivot":16,"XCrop":328}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":144,"YPosition":203,"YPivot":16,"XPosition":193,"YCrop":576,"Height":32,"XPivot":16,"XCrop":256}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "07_Samson": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":176,"contentBounds":{"y":9,"x":7,"height":35,"width":34}}), menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":224,"contentBounds":{"y":9,"x":7,"height":35,"width":34}})],
      lockedHint: menuFrame({"XCrop":224,"Height":48,"YPivot":16,"Width":208,"YCrop":624,"XPosition":156,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":213,"YCrop":480,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":8,"y":6,"width":65,"height":19}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":14,"YPosition":210,"YPivot":16,"XPosition":190,"YCrop":1036,"Height":19,"XPivot":16,"XCrop":155}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":128,"YPosition":205,"YPivot":16,"XPosition":201,"YCrop":544,"Height":32,"XPivot":16,"XCrop":272}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":21,"YPivot":16,"YCrop":1032,"Height":24,"XPivot":16,"XCrop":240,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":20,"YPosition":232,"YPivot":16,"XPosition":182,"YCrop":1032,"Height":25,"XPivot":16,"XCrop":241}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":128,"YPosition":229,"YPivot":16,"XPosition":203,"YCrop":880,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "11_TheLost": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":416,"contentBounds":{"y":12,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":224,"contentBounds":{"y":11,"x":12,"height":33,"width":25}})],
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":224,"YCrop":384,"Height":32,"XPivot":16,"XCrop":80,"contentBounds":{"x":8,"y":5,"width":39,"height":22}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":30,"YPosition":226,"YPivot":16,"XPosition":181,"YCrop":1029,"Height":32,"XPivot":16,"XCrop":98}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":128,"YPosition":223,"YPivot":16,"XPosition":209,"YCrop":816,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":48}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":19,"YPosition":206,"YPivot":16,"XPosition":194,"YCrop":1034,"Height":22,"XPivot":16,"XCrop":261}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":202,"YPivot":16,"XPosition":211,"YCrop":880,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "05_Eve": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":368,"contentBounds":{"y":10,"x":9,"height":34,"width":30}}), menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":416,"contentBounds":{"y":10,"x":9,"height":34,"width":30}})],
      lockedHint: menuFrame({"XCrop":0,"Height":48,"YPivot":16,"Width":208,"YCrop":704,"XPosition":157,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":224,"YCrop":416,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":8,"y":7,"width":36,"height":17}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":27,"YPosition":197,"YPivot":16,"XPosition":186,"YCrop":1033,"Height":24,"XPivot":16,"XCrop":4}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":194,"YPivot":16,"XPosition":209,"YCrop":544,"Height":32,"XPivot":16,"XCrop":400}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":27,"YPosition":216,"YPivot":16,"XPosition":173,"YCrop":1032,"Height":26,"XPivot":16,"XCrop":197}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":144,"YPosition":216,"YPivot":16,"XPosition":200,"YCrop":576,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":15,"YPosition":240,"YPivot":16,"XPosition":194,"YCrop":1035,"Height":21,"XPivot":16,"XCrop":462}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":128,"YPosition":233,"YPivot":16,"XPosition":210,"YCrop":784,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "04_Judas": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":272,"contentBounds":{"y":6,"x":10,"height":38,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":320,"contentBounds":{"y":6,"x":10,"height":38,"width":28}})],
      lockedHint: menuFrame({"XCrop":288,"Height":16,"YPivot":16,"Width":64,"YCrop":608,"XPosition":220,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":219,"YCrop":384,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":4,"y":7,"width":58,"height":18}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":23,"YPosition":205,"YPivot":16,"XPosition":173,"YCrop":1030,"Height":28,"XPivot":16,"XCrop":54}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":144,"YPosition":206,"YPivot":16,"XPosition":195,"YCrop":544,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":512,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "15_Apollyon": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":928,"Height":48,"XPivot":24,"XCrop":384,"contentBounds":{"y":11,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":928,"Height":48,"XPivot":24,"XCrop":432,"contentBounds":{"y":11,"x":10,"height":33,"width":28}})],
      lockedHint: menuFrame({"XCrop":240,"Height":32,"YPivot":16,"Width":160,"YCrop":800,"XPosition":173,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":96,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":480,"Height":32,"XPivot":16,"XCrop":256,"contentBounds":{"x":6,"y":8,"width":68,"height":18}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":25,"YPosition":207,"YPivot":16,"XPosition":215,"YCrop":1031,"Height":28,"XPivot":16,"XCrop":417}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":64,"YPosition":204,"YPivot":16,"XPosition":233,"YCrop":992,"Height":32,"XPivot":16,"XCrop":136}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "01_Isaac": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":176,"contentBounds":{"y":11,"x":10,"height":33,"width":28}})],
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":219,"YCrop":288,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":4,"y":8,"width":57,"height":19}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":24,"YPosition":209,"YPivot":16,"XPosition":207,"YCrop":1033,"Height":23,"XPivot":16,"XCrop":31}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":205,"YPivot":16,"XPosition":226,"YCrop":544,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "12_Lilith": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":320,"contentBounds":{"y":9,"x":0,"height":35,"width":41}}), menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":320,"contentBounds":{"y":11,"x":7,"height":33,"width":34}})],
      lockedHint: menuFrame({"XCrop":240,"Height":48,"YPivot":16,"Width":160,"YCrop":752,"XPosition":173,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":212,"YCrop":480,"Height":32,"XPivot":16,"XCrop":176,"contentBounds":{"x":12,"y":7,"width":55,"height":22}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":30,"YPosition":209,"YPivot":16,"XPosition":195,"YCrop":1033,"Height":24,"XPivot":16,"XCrop":280}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":96,"YPosition":200,"YPivot":16,"XPosition":222,"YCrop":816,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":20,"YPosition":231,"YPivot":16,"XPosition":178,"YCrop":1030,"Height":27,"XPivot":16,"XCrop":398}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":128,"YPosition":229,"YPivot":16,"XPosition":201,"YCrop":992,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "03_Cain": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":272,"contentBounds":{"y":11,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":224,"contentBounds":{"y":11,"x":10,"height":33,"width":28}})],
      lockedHint: menuFrame({"XCrop":0,"Height":32,"YPivot":16,"Width":192,"YCrop":672,"XPosition":157,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":219,"YCrop":320,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":7,"y":9,"width":48,"height":17}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":26,"YPosition":200,"YPivot":16,"XPosition":192,"YCrop":1027,"Height":29,"XPivot":16,"XCrop":351}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":201,"YPivot":16,"XPosition":215,"YCrop":608,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":22,"YPosition":230,"YPivot":16,"XPosition":197,"YCrop":1033,"Height":23,"XPivot":16,"XCrop":477}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":96,"YPosition":224,"YPivot":16,"XPosition":218,"YCrop":784,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "13_Keeper": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":368,"contentBounds":{"y":11,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":224,"contentBounds":{"y":11,"x":12,"height":33,"width":25}})],
      lockedHint: menuFrame({"XCrop":288,"Height":16,"YPivot":16,"Width":64,"YCrop":608,"XPosition":220,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":211,"YCrop":512,"Height":32,"XPivot":16,"XCrop":176,"contentBounds":{"x":14,"y":7,"width":54,"height":20}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":25,"YPosition":205,"YPivot":16,"XPosition":177,"YCrop":1034,"Height":22,"XPivot":16,"XCrop":130}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":128,"YPosition":198,"YPivot":16,"XPosition":206,"YCrop":752,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":18,"YPosition":226,"YPivot":16,"XPosition":197,"YCrop":1030,"Height":26,"XPivot":16,"XCrop":310}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":96,"YPosition":220,"YPivot":16,"XPosition":217,"YCrop":752,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":16,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XCrop":96}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "18_JacobEsau": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":464,"contentBounds":{"y":8,"x":1,"height":36,"width":46}}), menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":464,"contentBounds":{"y":8,"x":9,"height":36,"width":30}})],
      lockedHint: menuFrame({"XCrop":240,"Height":32,"YPivot":16,"Width":160,"YCrop":880,"XPosition":174,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":832,"Height":32,"XPivot":16,"XCrop":432,"contentBounds":{"x":9,"y":3,"width":61,"height":26}}),
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":800,"Height":32,"XPivot":16,"XCrop":432,"contentBounds":{"x":9,"y":8,"width":61,"height":17}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":416,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":448,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "02_Magdalene": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":176,"contentBounds":{"y":5,"x":5,"height":39,"width":39}}), menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":224,"contentBounds":{"y":5,"x":5,"height":39,"width":39}})],
      lockedHint: menuFrame({"XCrop":0,"Height":32,"YPivot":16,"Width":192,"YCrop":640,"XPosition":158,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":213,"YCrop":352,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":3,"y":6,"width":75,"height":19}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":28,"YPosition":208,"YPivot":16,"XPosition":191,"YCrop":1033,"Height":23,"XPivot":16,"XCrop":169}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":205,"YPivot":16,"XPosition":212,"YCrop":576,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":20,"YPosition":232,"YPivot":16,"XPosition":215,"YCrop":1034,"Height":21,"XPivot":16,"XCrop":77}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":229,"YPivot":16,"XPosition":230,"YCrop":848,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "10_Eden": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":176,"contentBounds":{"y":11,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":272,"contentBounds":{"y":11,"x":10,"height":33,"width":28}})],
      lockedHint: menuFrame({"XCrop":288,"Height":16,"YPivot":16,"Width":64,"YCrop":608,"XPosition":220,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":149,"YPivot":16,"XPosition":222,"YCrop":352,"Height":32,"XPivot":16,"XCrop":80,"contentBounds":{"x":7,"y":7,"width":46,"height":15}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":227,"YPivot":16,"XPosition":177,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80,"Visible":false}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":144,"YPosition":229,"YPivot":16,"XPosition":203,"YCrop":544,"Height":32,"XPivot":16,"XCrop":272,"Visible":false}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":48}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":512,"Height":32,"XPivot":16,"XCrop":48}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":512,"Height":32,"XPivot":16,"XCrop":48}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "08_Azazel": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":272,"contentBounds":{"y":2,"x":5,"height":42,"width":38}}), menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":320,"contentBounds":{"y":2,"x":5,"height":42,"width":38}})],
      lockedHint: menuFrame({"XCrop":224,"Height":48,"YPivot":16,"Width":208,"YCrop":672,"XPosition":151,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":219,"YCrop":320,"Height":32,"XPivot":16,"XCrop":80,"contentBounds":{"x":5,"y":8,"width":56,"height":16}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":227,"YPivot":16,"XPosition":177,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80,"Visible":false}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":144,"YPosition":229,"YPivot":16,"XPosition":203,"YCrop":544,"Height":32,"XPivot":16,"XCrop":272,"Visible":false}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":512,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "06_Bluebaby": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":368,"contentBounds":{"y":11,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":224,"contentBounds":{"y":11,"x":12,"height":33,"width":25}})],
      lockedHint: menuFrame({"XCrop":416,"Height":16,"YPivot":16,"Width":16,"YCrop":608,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":223,"YCrop":448,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":10,"y":4,"width":36,"height":22}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":22,"YPosition":207,"YPivot":16,"XPosition":195,"YCrop":1032,"Height":22,"XPivot":16,"XCrop":376}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":205,"YPivot":16,"XPosition":216,"YCrop":608,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "16_TheForgotten": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":928,"Height":48,"XPivot":24,"XCrop":336,"contentBounds":{"y":2,"x":0,"height":42,"width":39}}), menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":224,"contentBounds":{"y":11,"x":12,"height":33,"width":25}})],
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":512,"Height":32,"XPivot":16,"XCrop":256,"contentBounds":{"x":8,"y":3,"width":65,"height":24}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":512,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
    "09_Lazarus": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":368,"contentBounds":{"y":10,"x":9,"height":34,"width":29}}), menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":416,"contentBounds":{"y":10,"x":9,"height":34,"width":29}})],
      lockedHint: menuFrame({"XCrop":224,"Height":32,"YPivot":16,"Width":192,"YCrop":720,"XPosition":158,"YPosition":180,"XPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":288,"Height":32,"XPivot":16,"XCrop":80,"contentBounds":{"x":6,"y":8,"width":63,"height":17}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":227,"YPivot":16,"XPosition":177,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80,"Visible":false}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":144,"YPosition":229,"YPivot":16,"XPosition":203,"YCrop":544,"Height":32,"XPivot":16,"XCrop":272,"Visible":false}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":16,"YPosition":211,"YPivot":16,"XPosition":207,"YCrop":1033,"Height":24,"XPivot":16,"XCrop":224}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":209,"YPivot":16,"XPosition":222,"YCrop":912,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenu.png", visible: true, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenu.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenu.png", visible: true, frames: [

        ] }
      ],
    },
  },
  tainted: {
    "17_Bethany": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":464,"contentBounds":{"y":5,"x":3,"height":39,"width":42}}), menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":464,"contentBounds":{"y":5,"x":3,"height":39,"width":42}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":768,"Height":32,"XPivot":16,"XCrop":432,"contentBounds":{"x":8,"y":7,"width":66,"height":18}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":203,"YPivot":16,"XPosition":165,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":192,"YPosition":202,"YPivot":16,"XPosition":162,"YCrop":704,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":25,"YPosition":231,"YPivot":16,"XPosition":184,"YCrop":1026,"Height":32,"XPivot":16,"XCrop":275}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":128,"YPosition":231,"YPivot":16,"XPosition":204,"YCrop":752,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "07_Samson": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":176,"contentBounds":{"y":8,"x":10,"height":36,"width":29}}), menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":224,"contentBounds":{"y":8,"x":10,"height":36,"width":29}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":213,"YCrop":480,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":8,"y":6,"width":65,"height":19}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":27,"YPosition":218,"YPivot":16,"XPosition":193,"YCrop":1023,"Height":33,"XPivot":16,"XCrop":57}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":218,"YPivot":16,"XPosition":209,"YCrop":576,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":192,"YPosition":202,"YPivot":16,"XPosition":164,"YCrop":752,"Height":24,"XPivot":16,"XCrop":240}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":230,"YPivot":16,"XPosition":175,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":128,"YPosition":229,"YPivot":16,"XPosition":203,"YCrop":880,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "11_TheLost": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":416,"contentBounds":{"y":12,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":480,"Height":48,"XPivot":24,"XCrop":416,"contentBounds":{"y":12,"x":10,"height":33,"width":28}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":224,"YCrop":384,"Height":32,"XPivot":16,"XCrop":80,"contentBounds":{"x":8,"y":5,"width":39,"height":22}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":205,"YPivot":16,"XPosition":178,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":203,"YPivot":16,"XPosition":197,"YCrop":544,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":48}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":232,"YPivot":16,"XPosition":198,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":80,"YPosition":234,"YPivot":16,"XPosition":223,"YCrop":992,"Height":32,"XPivot":16,"XCrop":352}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "05_Eve": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":368,"contentBounds":{"y":8,"x":7,"height":36,"width":33}}), menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":416,"contentBounds":{"y":8,"x":7,"height":36,"width":33}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":224,"YCrop":416,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":8,"y":7,"width":36,"height":17}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":23,"YPosition":217,"YPivot":16,"XPosition":186,"YCrop":1028,"Height":31,"XPivot":16,"XCrop":118}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":128,"YPosition":217,"YPivot":16,"XPosition":202,"YCrop":784,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":214,"YPivot":16,"XPosition":172,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":192,"YPosition":196,"YPivot":16,"XPosition":162,"YCrop":800,"Height":32,"XPivot":16,"XCrop":240}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":235,"YPivot":16,"XPosition":183,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":128,"YPosition":233,"YPivot":16,"XPosition":210,"YCrop":784,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "04_Judas": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":272,"contentBounds":{"y":6,"x":10,"height":38,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":320,"contentBounds":{"y":6,"x":10,"height":38,"width":28}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":219,"YCrop":384,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":4,"y":7,"width":58,"height":18}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":20,"YPosition":217,"YPivot":16,"XPosition":195,"YCrop":1021,"Height":34,"XPivot":16,"XCrop":230}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":217,"YPivot":16,"XPosition":211,"YCrop":608,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":208,"YPosition":201,"YPivot":16,"XPosition":241,"YCrop":720,"Height":32,"XPivot":104,"XCrop":224}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "15_Apollyon": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":928,"Height":48,"XPivot":24,"XCrop":384,"contentBounds":{"y":9,"x":9,"height":35,"width":30}}), menuFrame({"Width":48,"YPivot":24,"YCrop":928,"Height":48,"XPivot":24,"XCrop":432,"contentBounds":{"y":9,"x":9,"height":35,"width":30}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":96,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":480,"Height":32,"XPivot":16,"XCrop":256,"contentBounds":{"x":6,"y":8,"width":68,"height":18}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":27,"YPosition":218,"YPivot":16,"XPosition":211,"YCrop":1027,"Height":29,"XPivot":16,"XCrop":143}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":217,"YPivot":16,"XPosition":210,"YCrop":608,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":240,"YPosition":195,"YPivot":16,"XPosition":138,"YCrop":912,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "01_Isaac": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":176,"contentBounds":{"y":11,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":224,"contentBounds":{"y":11,"x":10,"height":33,"width":28}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":219,"YCrop":288,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":4,"y":8,"width":57,"height":19}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":205,"YPivot":16,"XPosition":200,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":144,"YPosition":205,"YPivot":16,"XPosition":185,"YCrop":544,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "12_Lilith": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":320,"contentBounds":{"y":9,"x":5,"height":35,"width":37}}), menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":416,"contentBounds":{"y":9,"x":5,"height":35,"width":37}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":212,"YCrop":480,"Height":32,"XPivot":16,"XCrop":176,"contentBounds":{"x":12,"y":7,"width":55,"height":22}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":205,"YPivot":16,"XPosition":194,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":240,"YPosition":196,"YPivot":16,"XPosition":141,"YCrop":880,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":25,"YPosition":217,"YPivot":16,"XPosition":208,"YCrop":1025,"Height":31,"XPivot":16,"XCrop":31}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":128,"YPosition":219,"YPivot":16,"XPosition":201,"YCrop":816,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "03_Cain": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":272,"contentBounds":{"y":11,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":320,"contentBounds":{"y":11,"x":10,"height":33,"width":28}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":219,"YCrop":320,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":7,"y":9,"width":48,"height":17}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":200,"YPivot":16,"XPosition":187,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":205,"YPivot":16,"XPosition":197,"YCrop":576,"Height":32,"XPivot":16,"XCrop":400}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":28,"YPosition":222,"YPivot":16,"XPosition":174,"YCrop":1024,"Height":29,"XPivot":16,"XCrop":200}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":192,"YPosition":222,"YPivot":16,"XPosition":173,"YCrop":640,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "13_Keeper": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":368,"contentBounds":{"y":11,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":480,"Height":48,"XPivot":24,"XCrop":464,"contentBounds":{"y":11,"x":10,"height":33,"width":28}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":211,"YCrop":512,"Height":32,"XPivot":16,"XCrop":176,"contentBounds":{"x":14,"y":7,"width":54,"height":20}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":200,"YPivot":16,"XPosition":173,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":144,"YPosition":205,"YPivot":16,"XPosition":180,"YCrop":544,"Height":32,"XPivot":16,"XCrop":256}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":225,"YPivot":16,"XPosition":190,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":96,"YPosition":220,"YPivot":16,"XPosition":222,"YCrop":752,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "18_JacobEsau": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":464,"contentBounds":{"y":6,"x":9,"height":38,"width":30}}), menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":464,"contentBounds":{"y":6,"x":9,"height":38,"width":30}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":800,"Height":32,"XPivot":16,"XCrop":432,"contentBounds":{"x":9,"y":8,"width":61,"height":17}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [

        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":208,"YPosition":201,"YPivot":16,"XPosition":239,"YCrop":672,"Height":32,"XPivot":104,"XCrop":224}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":28,"YPosition":219,"YPivot":16,"XPosition":185,"YCrop":1026,"Height":35,"XPivot":16,"XCrop":88}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":220,"YPivot":16,"XPosition":253,"YCrop":784,"Height":32,"XPivot":56,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "02_Magdalene": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":176,"contentBounds":{"y":5,"x":3,"height":39,"width":35}}), menuFrame({"Width":48,"YPivot":24,"YCrop":336,"Height":48,"XPivot":24,"XCrop":224,"contentBounds":{"y":5,"x":3,"height":39,"width":35}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":213,"YCrop":352,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":3,"y":6,"width":75,"height":19}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":205,"YPivot":16,"XPosition":185,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":144,"YPosition":202,"YPivot":16,"XPosition":183,"YCrop":576,"Height":32,"XPivot":16,"XCrop":256}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":16}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":28,"YPosition":231,"YPivot":16,"XPosition":193,"YCrop":1027,"Height":26,"XPivot":16,"XCrop":301}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":229,"YPivot":16,"XPosition":214,"YCrop":544,"Height":32,"XPivot":16,"XCrop":400}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "10_Eden": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":176,"contentBounds":{"y":2,"x":10,"height":42,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":432,"Height":48,"XPivot":24,"XCrop":272,"contentBounds":{"y":2,"x":10,"height":42,"width":28}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":149,"YPivot":16,"XPosition":222,"YCrop":352,"Height":32,"XPivot":16,"XCrop":80,"contentBounds":{"x":7,"y":7,"width":46,"height":15}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":227,"YPivot":16,"XPosition":177,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80,"Visible":false}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":144,"YPosition":195,"YPivot":16,"XPosition":184,"YCrop":576,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":48}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":512,"Height":32,"XPivot":16,"XCrop":48}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":512,"Height":32,"XPivot":16,"XCrop":48}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "08_Azazel": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":272,"contentBounds":{"y":5,"x":8,"height":39,"width":32}}), menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":320,"contentBounds":{"y":5,"x":8,"height":39,"width":32}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":219,"YCrop":320,"Height":32,"XPivot":16,"XCrop":80,"contentBounds":{"x":5,"y":8,"width":56,"height":16}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":227,"YPivot":16,"XPosition":177,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80,"Visible":false}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":192,"YPosition":199,"YPivot":16,"XPosition":161,"YCrop":832,"Height":48,"XPivot":16,"XCrop":240}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":512,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":30,"YPosition":221,"YPivot":16,"XPosition":183,"YCrop":1028,"Height":28,"XPivot":16,"XCrop":170}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":220,"YPivot":16,"XPosition":210,"YCrop":848,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "06_Bluebaby": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":288,"Height":48,"XPivot":24,"XCrop":368,"contentBounds":{"y":11,"x":10,"height":33,"width":28}}), menuFrame({"Width":48,"YPivot":24,"YCrop":480,"Height":48,"XPivot":24,"XCrop":368,"contentBounds":{"y":11,"x":10,"height":33,"width":28}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":223,"YCrop":448,"Height":32,"XPivot":16,"XCrop":0,"contentBounds":{"x":10,"y":4,"width":36,"height":22}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":205,"YPivot":16,"XPosition":188,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":208,"YPosition":196,"YPivot":16,"XPosition":238,"YCrop":624,"Height":48,"XPivot":104,"XCrop":224}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":23,"YPosition":229,"YPivot":16,"XPosition":216,"YCrop":1029,"Height":27,"XPivot":16,"XCrop":6}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":227,"YPivot":16,"XPosition":208,"YCrop":816,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "16_TheForgotten": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":928,"Height":48,"XPivot":24,"XCrop":336,"contentBounds":{"y":8,"x":1,"height":36,"width":40}}), menuFrame({"Width":48,"YPivot":24,"YCrop":880,"Height":48,"XPivot":24,"XCrop":336,"contentBounds":{"y":15,"x":9,"height":29,"width":32}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":512,"Height":32,"XPivot":16,"XCrop":256,"contentBounds":{"x":8,"y":3,"width":65,"height":24}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [

        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":192,"YPosition":200,"YPivot":16,"XPosition":165,"YCrop":776,"Height":24,"XPivot":16,"XCrop":240}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":480,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":144}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":512,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
    "09_Lazarus": {
      portraits: [menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":368,"contentBounds":{"y":9,"x":7,"height":35,"width":33}}), menuFrame({"Width":48,"YPivot":24,"YCrop":384,"Height":48,"XPivot":24,"XCrop":416,"contentBounds":{"y":9,"x":7,"height":35,"width":33}})],
      lockedHint: menuFrame({"Height":16,"XPosition":220,"Width":64,"XPivot":16,"XCrop":288,"YCrop":608,"YPosition":180,"YPivot":16}),
      layers: [
        { id: 0, name: "Background", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":480,"YCrop":0,"Height":270,"XCrop":0}),
        ] },
        { id: 1, name: "Left Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":157,"YCrop":272,"Height":16,"XCrop":0,"contentBounds":{"y":2,"height":13,"width":16,"x":5}}),
        ] },
        { id: 2, name: "Right Arrow", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":140,"XPosition":291,"YCrop":272,"Height":16,"XCrop":32,"contentBounds":{"y":0,"height":16,"width":17,"x":4}}),
        ] },
        { id: 3, name: "Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":80,"YPosition":148,"YPivot":16,"XPosition":215,"YCrop":288,"Height":32,"XPivot":16,"XCrop":80,"contentBounds":{"x":6,"y":8,"width":63,"height":17}}),
        ] },
        { id: 4, name: "Life Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":167,"YCrop":416,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 5, name: "Speed Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":230,"YCrop":416,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 6, name: "Power Icon", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":173,"YPivot":16,"XPosition":291,"YCrop":448,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 7, name: "Item Icon", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPosition":227,"YPivot":16,"XPosition":177,"YCrop":448,"Height":32,"XPivot":16,"XCrop":80,"Visible":false}),
        ] },
        { id: 8, name: "Item Name", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":192,"YPosition":198,"YPivot":16,"XPosition":162,"YCrop":672,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 9, name: "Life Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":196,"YCrop":512,"Height":32,"XPivot":16,"XCrop":80}),
        ] },
        { id: 10, name: "Speed Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":260,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 11, name: "Power Stat", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":32,"YPosition":172,"YPivot":16,"XPosition":315,"YCrop":480,"Height":32,"XPivot":16,"XCrop":112}),
        ] },
        { id: 12, name: "Item Icon 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":22,"YPosition":225,"YPivot":16,"XPosition":215,"YCrop":1030,"Height":21,"XPivot":16,"XCrop":252}),
        ] },
        { id: 13, name: "Item Name 2", sheet: "charactermenualt.png", visible: true, frames: [
          menuFrame({"Width":112,"YPosition":221,"YPivot":16,"XPosition":206,"YCrop":752,"Height":32,"XPivot":16,"XCrop":0}),
        ] },
        { id: 14, name: "Item Icon 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 15, name: "Item Name 3", sheet: "charactermenualt.png", visible: false, frames: [
          menuFrame({"Width":32,"YPivot":16,"YCrop":0,"Height":32,"XPivot":16,"XCrop":0,"Visible":false}),
        ] },
        { id: 17, name: "Blood", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 18, name: "Blood2", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 20, name: "Blood3", sheet: "charactermenualt.png", visible: true, frames: [

        ] },
        { id: 19, name: "Overlay", sheet: "charactermenualt.png", visible: true, frames: [

        ] }
      ],
    },
  },
  completion: [
    { id: 0, name: "Paper", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":96,"YPivot":16,"YCrop":0,"Height":96,"XPivot":16,"XCrop":0}),
      menuFrame({"Width":96,"YPivot":16,"YCrop":128,"Height":96,"XPivot":16,"XCrop":0}),
      menuFrame({"Width":96,"YPivot":16,"YCrop":224,"Height":96,"XPivot":16,"XCrop":0}),
      menuFrame({"Width":96,"YPivot":16,"YCrop":128,"Height":96,"XPivot":16,"XCrop":192}),
      menuFrame({"Width":96,"YPivot":16,"YCrop":224,"Height":96,"XPivot":16,"XCrop":192}),
      menuFrame({"Width":96,"YPivot":16,"YCrop":0,"Height":96,"XPivot":16,"XCrop":96}),
      menuFrame({"Width":96,"YPivot":16,"YCrop":128,"Height":96,"XPivot":16,"XCrop":96}),
      menuFrame({"Width":96,"YPivot":16,"YCrop":224,"Height":96,"XPivot":16,"XCrop":96}),
      menuFrame({"Width":96,"YPivot":16,"YCrop":128,"Height":96,"XPivot":16,"XCrop":288}),
      menuFrame({"Width":96,"YPivot":16,"YCrop":224,"Height":96,"XPivot":16,"XCrop":288}),
    ] },
    { id: 1, name: "Heart", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":7,"YPivot":16,"XPosition":22,"YCrop":112,"Height":16,"XPivot":16,"XCrop":64}),
      menuFrame({"Width":16,"YPosition":7,"YPivot":16,"XPosition":22,"YCrop":112,"Height":16,"XPivot":16,"XCrop":64}),
      menuFrame({"Width":16,"YPosition":7,"YPivot":16,"XPosition":22,"YCrop":96,"Height":16,"XPivot":16,"XCrop":64}),
      menuFrame({"Width":16,"YPosition":7,"YPivot":16,"XPosition":22,"YCrop":320,"Height":16,"XPivot":16,"XCrop":64}),
      menuFrame({"Width":16,"YPosition":7,"YPivot":16,"XPosition":22,"YCrop":336,"Height":16,"XPivot":16,"XCrop":64}),
    ] },
    { id: 2, name: "Cross", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":17,"YPivot":16,"XPosition":34,"YCrop":112,"Height":16,"XPivot":16,"XCrop":32}),
      menuFrame({"Width":16,"YPosition":17,"YPivot":16,"XPosition":34,"YCrop":112,"Height":16,"XPivot":16,"XCrop":32}),
      menuFrame({"Width":16,"YPosition":17,"YPivot":16,"XPosition":34,"YCrop":96,"Height":16,"XPivot":16,"XCrop":32}),
      menuFrame({"Width":16,"YPosition":17,"YPivot":16,"XPosition":34,"YCrop":320,"Height":16,"XPivot":16,"XCrop":32}),
      menuFrame({"Width":16,"YPosition":17,"YPivot":16,"XPosition":34,"YCrop":336,"Height":16,"XPivot":16,"XCrop":32}),
    ] },
    { id: 3, name: "UpsideDownCross", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":23,"YPivot":16,"XPosition":25,"YCrop":112,"Height":16,"XPivot":16,"XCrop":48}),
      menuFrame({"Width":16,"YPosition":23,"YPivot":16,"XPosition":25,"YCrop":112,"Height":16,"XPivot":16,"XCrop":48}),
      menuFrame({"Width":16,"YPosition":23,"YPivot":16,"XPosition":25,"YCrop":96,"Height":16,"XPivot":16,"XCrop":48}),
      menuFrame({"Width":16,"YPosition":23,"YPivot":16,"XPosition":25,"YCrop":320,"Height":16,"XPivot":16,"XCrop":48}),
      menuFrame({"Width":16,"YPosition":23,"YPivot":16,"XPosition":25,"YCrop":336,"Height":16,"XPivot":16,"XCrop":48}),
    ] },
    { id: 4, name: "Star", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":36,"YPivot":16,"XPosition":14,"YCrop":112,"Height":16,"XPivot":16,"XCrop":80}),
      menuFrame({"Width":16,"YPosition":36,"YPivot":16,"XPosition":14,"YCrop":112,"Height":16,"XPivot":16,"XCrop":80}),
      menuFrame({"Width":16,"YPosition":36,"YPivot":16,"XPosition":14,"YCrop":96,"Height":16,"XPivot":16,"XCrop":80}),
      menuFrame({"Width":16,"YPosition":36,"YPivot":16,"XPosition":14,"YCrop":320,"Height":16,"XPivot":16,"XCrop":80}),
      menuFrame({"Width":16,"YPosition":36,"YPivot":16,"XPosition":14,"YCrop":336,"Height":16,"XPivot":16,"XCrop":80}),
    ] },
    { id: 5, name: "Polaroid", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":20,"YPivot":16,"XPosition":49,"YCrop":112,"Height":16,"XPivot":16,"XCrop":0}),
      menuFrame({"Width":16,"YPosition":20,"YPivot":16,"XPosition":49,"YCrop":112,"Height":16,"XPivot":16,"XCrop":0}),
      menuFrame({"Width":16,"YPosition":20,"YPivot":16,"XPosition":49,"YCrop":96,"Height":16,"XPivot":16,"XCrop":0}),
      menuFrame({"Width":16,"YPosition":20,"YPivot":16,"XPosition":49,"YCrop":320,"Height":16,"XPivot":16,"XCrop":0}),
      menuFrame({"Width":16,"YPosition":20,"YPivot":16,"XPosition":49,"YCrop":336,"Height":16,"XPivot":16,"XCrop":0}),
    ] },
    { id: 6, name: "Negative", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":32,"YPivot":16,"XPosition":37,"YCrop":112,"Height":16,"XPivot":16,"XCrop":16}),
      menuFrame({"Width":16,"YPosition":32,"YPivot":16,"XPosition":37,"YCrop":112,"Height":16,"XPivot":16,"XCrop":16}),
      menuFrame({"Width":16,"YPosition":32,"YPivot":16,"XPosition":37,"YCrop":96,"Height":16,"XPivot":16,"XCrop":16}),
      menuFrame({"Width":16,"YPosition":32,"YPivot":16,"XPosition":37,"YCrop":320,"Height":16,"XPivot":16,"XCrop":16}),
      menuFrame({"Width":16,"YPosition":32,"YPivot":16,"XPosition":37,"YCrop":336,"Height":16,"XPivot":16,"XCrop":16}),
    ] },
    { id: 7, name: "MegaSatan", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":37,"YPivot":16,"XPosition":54,"YCrop":112,"Height":16,"XPivot":16,"XCrop":112}),
      menuFrame({"Width":16,"YPosition":37,"YPivot":16,"XPosition":54,"YCrop":112,"Height":16,"XPivot":16,"XCrop":112}),
      menuFrame({"Width":16,"YPosition":37,"YPivot":16,"XPosition":54,"YCrop":96,"Height":16,"XPivot":16,"XCrop":112}),
      menuFrame({"Width":16,"YPosition":37,"YPivot":16,"XPosition":54,"YCrop":320,"Height":16,"XPivot":16,"XCrop":112}),
      menuFrame({"Width":16,"YPosition":37,"YPivot":16,"XPosition":54,"YCrop":336,"Height":16,"XPivot":16,"XCrop":112}),
    ] },
    { id: 8, name: "Greed", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":16,"YPivot":16,"XPosition":64,"YCrop":112,"Height":16,"XPivot":16,"XCrop":144}),
      menuFrame({"Width":16,"YPosition":16,"YPivot":16,"XPosition":64,"YCrop":112,"Height":16,"XPivot":16,"XCrop":144}),
      menuFrame({"Width":16,"YPosition":16,"YPivot":16,"XPosition":64,"YCrop":96,"Height":16,"XPivot":16,"XCrop":144}),
      menuFrame({"Width":16,"YPosition":16,"YPivot":16,"XPosition":64,"YCrop":320,"Height":16,"XPivot":16,"XCrop":144}),
      menuFrame({"Width":16,"YPosition":16,"YPivot":16,"XPosition":64,"YCrop":336,"Height":16,"XPivot":16,"XCrop":144}),
    ] },
    { id: 9, name: "Hush", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":51,"YPivot":16,"XPosition":11,"YCrop":112,"Height":16,"XPivot":16,"XCrop":128}),
      menuFrame({"Width":16,"YPosition":51,"YPivot":16,"XPosition":11,"YCrop":112,"Height":16,"XPivot":16,"XCrop":128}),
      menuFrame({"Width":16,"YPosition":51,"YPivot":16,"XPosition":11,"YCrop":96,"Height":16,"XPivot":16,"XCrop":128}),
      menuFrame({"Width":16,"YPosition":51,"YPivot":16,"XPosition":11,"YCrop":320,"Height":16,"XPivot":16,"XCrop":128}),
      menuFrame({"Width":16,"YPosition":51,"YPivot":16,"XPosition":11,"YCrop":336,"Height":16,"XPivot":16,"XCrop":128}),
    ] },
    { id: 10, name: "Knife", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":49,"YPivot":16,"XPosition":27,"YCrop":112,"Height":16,"XPivot":16,"XCrop":160}),
      menuFrame({"Width":16,"YPosition":49,"YPivot":16,"XPosition":27,"YCrop":112,"Height":16,"XPivot":16,"XCrop":160}),
      menuFrame({"Width":16,"YPosition":49,"YPivot":16,"XPosition":27,"YCrop":96,"Height":16,"XPivot":16,"XCrop":160}),
      menuFrame({"Width":16,"YPosition":49,"YPivot":16,"XPosition":27,"YCrop":320,"Height":16,"XPivot":16,"XCrop":160}),
      menuFrame({"Width":16,"YPosition":49,"YPivot":16,"XPosition":27,"YCrop":336,"Height":16,"XPivot":16,"XCrop":160}),
    ] },
    { id: 11, name: "DadsNote", sheet: "completion_widget.png", visible: true, frames: [
      menuFrame({"Width":16,"AlphaTint":105,"YPosition":54,"YPivot":16,"XPosition":41,"YCrop":112,"Height":16,"XPivot":16,"XCrop":176}),
      menuFrame({"Width":16,"YPosition":54,"YPivot":16,"XPosition":41,"YCrop":112,"Height":16,"XPivot":16,"XCrop":176}),
      menuFrame({"Width":16,"YPosition":54,"YPivot":16,"XPosition":41,"YCrop":96,"Height":16,"XPivot":16,"XCrop":176}),
      menuFrame({"Width":16,"YPosition":54,"YPivot":16,"XPosition":41,"YCrop":320,"Height":16,"XPivot":16,"XCrop":176}),
      menuFrame({"Width":16,"YPosition":54,"YPivot":16,"XPosition":41,"YCrop":336,"Height":16,"XPivot":16,"XCrop":176}),
    ] }
  ],
};

type ExportAction = 'sprite' | 'solo' | 'online' | 'pack-solo' | 'pack-online';

const MARK_KEYS: Record<string, string> = {
  Heart: "Mom's Heart", Cross: 'Isaac', UpsideDownCross: 'Satan', Star: 'Boss Rush',
  Polaroid: 'Blue Baby', Negative: 'The Lamb', MegaSatan: 'Mega Satan', Greed: 'Greed',
  Hush: 'Hush', Knife: 'Mother', DadsNote: 'The Beast',
};

function difficulty(value?: string) {
  return ['None', 'Normal', 'Hard', 'Online Normal', 'Online Hard'].indexOf(value ?? 'None');
}

function frameTransform(frame: Frame): string {
  return `translate(${frame.XPosition ?? 0} ${frame.YPosition ?? 0}) rotate(${frame.Rotation ?? 0}) scale(${(frame.XScale ?? 100) / 100} ${(frame.YScale ?? 100) / 100}) translate(${-(frame.XPivot ?? 0)} ${-(frame.YPivot ?? 0)})`;
}

const spriteImages = new Map<string, Promise<HTMLImageElement>>();

function loadSpriteImage(sheet: string): Promise<HTMLImageElement> {
  let pending = spriteImages.get(sheet);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        spriteImages.delete(sheet);
        reject(new Error(`No se pudo cargar /${sheet}`));
      };
      image.src = `/${sheet}`;
    });
    spriteImages.set(sheet, pending);
  }
  return pending;
}

function Crop({ frame, sheet }: { frame: Frame; sheet: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimensions = data.sheets[sheet];

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !dimensions) return;
    let cancelled = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    loadSpriteImage(sheet).then(image => {
      if (cancelled) return;
      context.imageSmoothingEnabled = false;
      // Extract at native resolution before any SVG/CSS scaling. Pixels from
      // neighbouring atlas cells never become part of this sprite's texture.
      context.drawImage(image, frame.XCrop, frame.YCrop, frame.Width, frame.Height,
        0, 0, frame.Width, frame.Height);
    }).catch(error => { if (!cancelled) console.error(error); });
    return () => { cancelled = true; };
  }, [sheet, dimensions, frame.XCrop, frame.YCrop, frame.Width, frame.Height]);

  if (!dimensions) return null;
  return (
    <foreignObject width={frame.Width} height={frame.Height} overflow="hidden">
      <canvas ref={canvasRef} width={frame.Width} height={frame.Height}
        className="pixelated" style={{ display: 'block', width: '100%', height: '100%' }} />
    </foreignObject>
  );
}

export function CharacterWheel({ characters, achievements, hasSave, selectedIndex, onSelect, isRepPlus, onExport }: {
  characters: CharacterJSON[];
  achievements: AchievementJSON[];
  hasSave: boolean;
  selectedIndex: number;
  onSelect: (index: number) => void;
  isRepPlus: boolean;
  onExport: (action: ExportAction, character: CharacterJSON) => void;
}) {
  const [completionMode, setCompletionMode] = useState<'solo' | 'online'>('solo');
  const selected = characters[selectedIndex];
  if (!selected) return null;
  const mode = selected.tainted ? 'tainted' : 'normal';
  const sheet = `${selected.tainted ? 'charactermenualt' : 'charactermenu'}.png`;
  const entry = data[mode][ANIMATIONS[selected.id % 17]];
  const selectedUnlock = getCharacterUnlock(selected.id, achievements, hasSave);
  const selectedLocked = selectedUnlock.state === 'locked';
  const ordered = characters.map((character, index) => ({ character, index }))
    .sort((a, b) => ANIMATIONS[a.character.id % 17].localeCompare(ANIMATIONS[b.character.id % 17]));
  const selectedSlot = ordered.findIndex(item => item.index === selectedIndex);
  const move = (direction: number) => onSelect(ordered[(selectedSlot + direction + ordered.length) % ordered.length].index);
  const online = isRepPlus && completionMode === 'online';
  const marks = online ? selected.onlineMarks : selected.soloMarks;

  function arrowStyle(name: string) {
    const frame = entry.layers.find(layer => layer.name === name)?.frames[0];
    if (!frame) return { display: 'none' };
    const bounds = frame.contentBounds ?? { x: 0, y: 0, width: frame.Width, height: frame.Height };
    const scaleX = (frame.XScale ?? 100) / 100;
    const scaleY = (frame.YScale ?? 100) / 100;
    const centerX = (frame.XPosition ?? 0) + (bounds.x + bounds.width / 2 - (frame.XPivot ?? 0)) * scaleX;
    const centerY = (frame.YPosition ?? 0) + (bounds.y + bounds.height / 2 - (frame.YPivot ?? 0)) * scaleY;
    const size = Math.max(bounds.width * scaleX, bounds.height * scaleY) + 8;
    return { left: `${centerX / 480 * 100}%`, top: `${centerY / 270 * 100}%`,
      width: `${size / 480 * 100}%`, height: `${size / 270 * 100}%` };
  }

  function completionFrame(layer: Layer): Frame | undefined {
    if (layer.name === 'Paper') {
      const paperIndex = (selected.tainted ? 5 : 0) + Math.max(0, difficulty(marks.Delirium));
      return layer.frames[paperIndex];
    }
    const state = difficulty(marks[MARK_KEYS[layer.name]]);
    // Uncompleted marks stay absent, matching the existing progress post-its.
    return state > 0 ? layer.frames[state] : undefined;
  }

  return (
    <div className="character-wheel-view">
      <div className="character-wheel-stage" role="group" aria-label="Rueda de personajes"
        tabIndex={0} onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            move(event.key === 'ArrowLeft' ? -1 : 1);
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            onSelect(event.key === 'Home' ? 0 : characters.length - 1);
          }
        }}>
        <svg viewBox="0 0 480 270" className="character-wheel-art pixelated" aria-hidden="true">
          {entry.layers.map(layer => {
            // These non-looping animations expose selectable states. Use state 0,
            // not a timer that alternates between unlocked and locked portraits.
            const frame = layer.frames[0];
            if (!layer.visible || !frame?.Visible) return null;
            if (selectedLocked && layer.id >= 4 && layer.id <= 15) return null;
            return (
              <g key={layer.id} transform={frameTransform(frame)} opacity={frame.AlphaTint / 255}>
                <Crop frame={frame} sheet={layer.sheet} />
              </g>
            );
          })}
          {selectedLocked && entry.lockedHint?.Visible && (
            <g transform={frameTransform(entry.lockedHint)} opacity={entry.lockedHint.AlphaTint / 255}>
              <Crop frame={entry.lockedHint} sheet={sheet} />
            </g>
          )}
        </svg>
        <div className="character-wheel-portraits" role="listbox" aria-label="Personajes"
          aria-orientation="horizontal">
          {ordered.map((item, slot) => {
            const { x, y, scale } = wheelPosition(slot, selectedSlot, ordered.length);
            const active = item.index === selectedIndex;
            const unlock = getCharacterUnlock(item.character.id, achievements, hasSave);
            const locked = unlock.state === 'locked';
            const portraits = data[mode][ANIMATIONS[item.character.id % 17]].portraits;
            const portrait = (locked ? portraits[1] : portraits[0]) ?? portraits[0];
            const bounds = portrait.contentBounds ?? { x: 0, y: 0, width: portrait.Width, height: portrait.Height };
            const localX = bounds.x - (portrait.XPivot ?? 0) + (portrait.XPosition ?? 0);
            const localY = bounds.y - (portrait.YPivot ?? 0) + (portrait.YPosition ?? 0);
            const name = item.character.character;
            return (
              <div key={item.character.id} className="character-wheel-portrait-anchor" role="presentation"
                style={{ left: `${x / 480 * 100}%`, top: `${y / 270 * 100}%`,
                  zIndex: Math.round(scale * 1000), transform: `translate(-50%, -50%) scale(${scale})` }}>
              <svg viewBox="-24 -24 48 48" className="character-wheel-portrait-art pixelated" overflow="visible" aria-hidden="true">
                {portrait.Visible && <g transform={frameTransform(portrait)} opacity={portrait.AlphaTint / 255}>
                  <Crop frame={portrait} sheet={sheet} />
                </g>}
              </svg>
              <button type="button" role="option" aria-selected={active}
                aria-label={name} aria-description={locked ? `Bloqueado. ${unlock.achievement?.unlock ?? ''}` : undefined}
                title={locked ? `${name} — Bloqueado: ${unlock.achievement?.unlock ?? ''}` : name}
                tabIndex={active ? 0 : -1}
                onClick={() => onSelect(item.index)}
                className={`character-wheel-portrait ${active ? 'is-selected' : ''}`}
                style={{ left: `${(localX + 24) / 48 * 100}%`, top: `${(localY + 24) / 48 * 100}%`,
                  width: `${bounds.width / 48 * 100}%`, height: `${bounds.height / 48 * 100}%` }}>
              </button>
              </div>
            );
          })}
        </div>
        <svg viewBox="0 0 480 270" className="character-wheel-foreground pixelated" aria-hidden="true">
          <g transform="translate(80 50)" pointerEvents="all">
            {data.completion.map(layer => {
              const frame = completionFrame(layer);
              if (!layer.visible || !frame?.Visible) return null;
              return <g key={layer.id} transform={frameTransform(frame)} opacity={frame.AlphaTint / 255}>
                <Crop frame={frame} sheet={layer.sheet} />
              </g>;
            })}
          </g>
        </svg>
        <button type="button" className="character-wheel-arrow" style={arrowStyle('Left Arrow')} aria-label="Personaje anterior" onClick={() => move(-1)} />
        <button type="button" className="character-wheel-arrow" style={arrowStyle('Right Arrow')} aria-label="Personaje siguiente" onClick={() => move(1)} />
        <div className="character-wheel-postit-controls">
          <div className="character-wheel-mode-switch" aria-label="Tipo de marcas">
            <button type="button" aria-pressed={!online} onClick={() => setCompletionMode('solo')}><i className="bi bi-person-fill" aria-hidden="true" />Solo</button>
            {isRepPlus && <button type="button" aria-pressed={online} onClick={() => setCompletionMode('online')}><i className="bi bi-globe2" aria-hidden="true" />Online</button>}
          </div>
        </div>
        <div className="character-wheel-actions" aria-label={`Exportar ${selected.character}`}>
          {selectedLocked && <span className="character-wheel-locked"><i className="bi bi-lock-fill" aria-hidden="true" /> Bloqueado</span>}
          <span className="character-wheel-actions-label">Exportar a Photoshop</span>
          <button type="button" onClick={() => onExport('sprite', selected)}>
            <i className="bi bi-image" aria-hidden="true" /><span>Sprite</span><i className="bi bi-download" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onExport(online ? 'online' : 'solo', selected)}>
            <i className="bi bi-sticky" aria-hidden="true" /><span>Post-it {online ? 'Online' : 'Solo'}</span><i className="bi bi-download" aria-hidden="true" />
          </button>
          <button type="button" className="character-wheel-pack" onClick={() => onExport(online ? 'pack-online' : 'pack-solo', selected)}>
            <i className="bi bi-collection" aria-hidden="true" /><span>Sprite + Post-it</span><i className="bi bi-download" aria-hidden="true" />
          </button>
        </div>
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{selected.character}</span>
    </div>
  );
}
