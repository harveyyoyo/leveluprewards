import { describe, expect, it, vi } from 'vitest';
import { themeCardStarter, captureThemeCard } from './cardDesignStarter';
import { sanitizeCardDesign } from '../../functions/src/cardDesign';
const theme = { background: '#112233', text: '#ffffff', primary: '#445566', accent: '#778899', cardBackground: '#112233', emoji: '🚀', fontFamily: 'Georgia', backgroundStyle: 'linear-gradient(90deg, #112233, #445566)' };
describe('current-theme card starters', () => {
  it('carries the colors, gradient, font, sticker and identity into editable pieces', () => {
    const design = themeCardStarter(theme, 'Sam Student', 'Demo School');
    expect(design.background).toBe(theme.background);
    expect(design.backgroundStyle).toBe(theme.backgroundStyle);
    expect(design.elements.find(e => e.binding === 'name')).toMatchObject({text:'Sam Student',fontFamily:'Georgia'});
    expect(design.elements.some(e => e.text === '🚀')).toBe(true);
    const saved = sanitizeCardDesign(design)!;
    expect(saved.elements.find(e => e.binding === 'school')?.text).toBe('Demo School');
  });
  it('keeps new editing choices when saved and reopened', () => {
    const design = themeCardStarter(theme, 'Sam');
    Object.assign(design.elements[0], {opacity:0.4,locked:true,align:'right',italic:true,label:'School heading'});
    expect(sanitizeCardDesign(design)?.elements[0]).toMatchObject({opacity:0.4,locked:true,align:'right',italic:true,label:'School heading'});
  });
  it('does not allow a background to load outside content', () => {
    expect(sanitizeCardDesign({...themeCardStarter(theme,'Sam'),backgroundStyle:'linear-gradient(url(https://outside.test/a))'})?.backgroundStyle).toBeUndefined();
  });
});

it('imports a split class label once and keeps the current background', () => {
  const root = document.createElement('div');
  root.innerHTML = '<div class="print-id-card" style="background:linear-gradient(90deg, #112233, #445566)"><div class="print-id-name">Sam Student</div><div class="print-id-class">Class: <span>Grade 5</span></div><div class="print-barcode">12345</div></div>';
  document.body.appendChild(root);
  const rect = {width:540,height:340,left:0,top:0,right:540,bottom:340,x:0,y:0,toJSON:()=>({})};
  const bounds = vi.spyOn(Element.prototype,'getBoundingClientRect').mockReturnValue(rect);
  const original = Object.getOwnPropertyDescriptor(Range.prototype,'getBoundingClientRect');
  Object.defineProperty(Range.prototype,'getBoundingClientRect',{configurable:true,value:()=>({...rect,width:180,height:25})});
  try {
    const design = captureThemeCard(root, {}, theme);
    expect(design.elements.filter(e => e.binding === 'class')).toHaveLength(1);
    expect(design.elements.find(e => e.binding === 'class')?.text).toBe('Class: Grade 5');
    expect(design.elements.some(e => e.text === '12345')).toBe(false);
    expect(design.background).toBe('#112233');
  } finally {
    bounds.mockRestore();root.remove();
    if(original) Object.defineProperty(Range.prototype,'getBoundingClientRect',original);
    else Reflect.deleteProperty(Range.prototype,'getBoundingClientRect');
  }
});
