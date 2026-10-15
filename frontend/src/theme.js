// Design tokens: a calm "payroll green" palette.
export const colors = {
  ink: '#13251F', // primary text
  inkMuted: '#52645D', // secondary text
  inkFaint: '#8A9A93', // placeholders, axis labels
  mist: '#F3F6F4', // app background
  paper: '#FFFFFF', // panels
  line: '#DCE4E0', // hairlines, input borders
  forest: '#0F5C4D', // primary action
  forestDeep: '#0A4338', // pressed / login backdrop
  mint: '#E3F1EB', // subtle primary tint
  amber: '#9A6416', // on-leave text
  amberTint: '#FBF0DA',
  activeText: '#17694F',
  activeTint: '#DDF2E8',
  brick: '#B4412F', // destructive
  brickTint: '#FBE9E5',
};

// Tier ramp: light -> dark green so colour encodes low -> high pay.
export const tierColors = ['#5FB08F', '#1F8A6B', '#0A4338'];
export const tierColor = (index) => tierColors[Math.min(index, tierColors.length - 1)];

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
};

export const radius = { sm: 6, md: 10, lg: 16 };

export const formatMoney = (n) =>
  Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
