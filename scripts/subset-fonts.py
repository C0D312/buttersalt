"""Rebuild licensed Latin WOFF2 subsets: pip install 'fonttools[woff]'."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parent.parent
unicode_ranges = 'U+0020-007E,U+00A0-00FF,U+0152-0153,U+02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2199'
for name in ('DMSans', 'Fraunces'):
    source = TTFont(root / 'public' / 'fonts' / f'{name}-Variable.woff2')
    # The design uses one optical size per family; only the sans needs variable
    # weights. Retain original masters for future languages/design changes.
    axes = {'opsz': 14} if name == 'DMSans' else {'opsz': 36, 'wght': 450}
    font = instantiateVariableFont(source, axes, inplace=False)
    options = subset.Options()
    options.flavor = 'woff2'
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=subset.parse_unicodes(unicode_ranges))
    subsetter.subset(font)
    font.flavor = 'woff2'
    font.save(root / 'public' / 'fonts' / f'{name}-Latin.woff2')
