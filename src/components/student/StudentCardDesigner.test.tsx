import React, { useState } from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StudentCardDesigner } from './StudentCardDesigner';
import { blankCardDesign } from '../../../functions/src/cardDesign';
afterEach(cleanup);
function Studio() {
  const [value, onChange] = useState(blankCardDesign());
  return <><StudentCardDesigner value={value} onChange={onChange} name="Alex Student" /><output data-testid="saved">{JSON.stringify(value)}</output></>;
}
const stored = () => JSON.parse(screen.getByTestId('saved').textContent!);
describe('student card studio', () => {
  it('adds, edits, copies, layers, deletes and restores artwork', () => {
    render(<Studio />);
    fireEvent.click(screen.getByText('+ Text'));
    fireEvent.change(screen.getByLabelText('Words or sticker'), { target: { value: 'Hello school' } });
    fireEvent.click(screen.getByText('Copy'));
    expect(stored().elements).toHaveLength(2);
    fireEvent.click(screen.getByText('To back'));
    expect(stored().elements[0].text).toBe('Hello school');
    fireEvent.click(screen.getByText('Delete'));
    expect(stored().elements).toHaveLength(1);
    fireEvent.click(screen.getByText('Undo'));
    expect(stored().elements).toHaveLength(2);
    fireEvent.click(screen.getByText('Redo'));
    expect(stored().elements).toHaveLength(1);
    fireEvent.click(screen.getByText('Start blank'));
    expect(stored().elements).toHaveLength(0);
    fireEvent.click(screen.getByText('Undo'));
    expect(stored().elements[0].text).toBe('Hello school');
  });
});

const existingTheme = {background:'#112233',text:'#ffffff',primary:'#445566',accent:'#778899',cardBackground:'#112233',emoji:'⭐'};
function ThemedStudio() {
  const [value, onChange] = useState<ReturnType<typeof blankCardDesign>>();
  return <><StudentCardDesigner value={value} onChange={onChange} currentTheme={existingTheme} name="Alex Student" /><output data-testid="saved">{JSON.stringify(value ?? {})}</output></>;
}
describe('theme starting points and extra controls', () => {
  it('loads the current theme as separate pieces and can undo a replacement', () => {
    render(<ThemedStudio />);
    fireEvent.click(screen.getByText('Start from my current card'));
    expect(stored().background).toBe('#112233');
    expect(stored().elements.some((e: {text:string}) => e.text === 'Alex Student')).toBe(true);
    fireEvent.click(screen.getByText('Start blank'));
    expect(stored().elements).toHaveLength(0);
    fireEvent.click(screen.getByText('Undo'));
    expect(stored().elements).toHaveLength(3);
  });
  it('locks pieces against movement and preserves opacity and rounded corners', () => {
    render(<Studio />);
    fireEvent.click(screen.getByText('+ Rectangle'));
    fireEvent.change(screen.getByLabelText('Opacity'), {target:{value:'40'}});
    fireEvent.change(screen.getByLabelText('Rounded corners'), {target:{value:'30'}});
    expect(stored().elements[0]).toMatchObject({opacity:0.4,radius:30});
    fireEvent.click(screen.getByLabelText('Lock this piece'));
    const piece = screen.getByRole('button', {name:'Select rectangle'});
    fireEvent.keyDown(piece, {key:'ArrowRight'});
    expect(stored().elements[0].x).toBe(30);
    fireEvent.click(screen.getByLabelText('Lock this piece'));
    fireEvent.keyDown(piece, {key:'ArrowRight',shiftKey:true});
    expect(stored().elements[0].x).toBe(40);
  });
});
