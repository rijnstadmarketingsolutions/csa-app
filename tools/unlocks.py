"""Bouwt een compacte unlock-kalender uit de open DefiLlama-dataset (dagelijks via GitHub Actions).
Schrijft tools/unlocks.sql met één kv-regel ('unlocks') voor de D1-database."""
import json, time, urllib.request, sys, re
BASE = 'https://defillama-datasets.llama.fi'
# DefiLlama-slug -> symbool zoals op Bitvavo/Vantis
MAP = {'arbitrum-foundation': 'ARB', 'arbitrum': 'ARB', 'optimism-foundation': 'OP', 'aptos': 'APT', 'sui-foundation': 'SUI', 'avalanche': 'AVAX', 'worldcoin': 'WLD', 'jupiter': 'JUP',
  'pyth': 'PYTH', 'layerzero': 'ZRO', 'starknet': 'STRK', 'sei': 'SEI', 'celestia': 'TIA', 'dydx': 'DYDX', 'ethena': 'ENA', 'ondo-finance': 'ONDO', 'immutablex': 'IMX',
  'axie-infinity': 'AXS', 'the-sandbox': 'SAND', 'decentraland': 'MANA', 'uniswap': 'UNI', 'aave': 'AAVE', 'lido': 'LDO', 'curve-finance': 'CRV', 'synthetix': 'SNX',
  'filecoin': 'FIL', 'internet-computer': 'ICP', 'injective-orderbook': 'INJ', 'pendle': 'PENDLE', 'eigenlayer': 'EIGEN', 'zksync': 'ZK', 'wormhole': 'W',
  'pudgy-penguins': 'PENGU', 'virtuals-protocol': 'VIRTUAL', 'kaito': 'KAITO', 'berachain': 'BERA', 'movement': 'MOVE', 'ether.fi': 'ETHFI', 'morpho': 'MORPHO',
  'helium-network': 'HNT', 'flare': 'FLR', 'mantra-dao': 'OM', 'big-time': 'BIGTIME', 'ankr': 'ANKR', 'sky': 'SKY', 'stargate-finance': 'STG', 'axelar-network': 'AXL',
  'zetachain': 'ZETA', 'maple-finance': 'SYRUP', 'usual': 'USUAL', 'babylon-protocol': 'BABY', 'aster': 'ASTER', 'plume-mainnet': 'PLUME', 'venice': 'VVV',
  'grass': 'GRASS', 'golem-network': 'GLM', 'metis': 'METIS', 'beam': 'BEAM', 'blast-l2': 'BLAST', 'altlayer': 'ALT', 'dune-protocol': 'DUNE', 'polygon': 'POL',
  'chainlink': 'LINK', 'the-graph': 'GRT', 'render': 'RENDER', 'fetch-ai': 'FET', 'near': 'NEAR', 'polkadot': 'DOT', 'cardano': 'ADA', 'solana': 'SOL', 'toncoin': 'TON',
  'mantle': 'MNT', 'gala': 'GALA', 'apecoin': 'APE', 'hyperliquid': 'HYPE', 'jito': 'JTO', 'ethena-labs': 'ENA', 'magic-eden': 'ME', 'scroll': 'SCR', 'linea': 'LINEA',
  'monad': 'MON', 'story': 'IP', 'walrus': 'WAL', 'humanity-protocol': 'H', 'lombard': 'BARD', 'falcon-finance': 'FF', 'kamino': 'KMNO', 'drift': 'DRIFT', 'across': 'ACX',
  'omni-network': 'OMNI', 'cowswap': 'COW', 'balancer': 'BAL', 'sushi': 'SUSHI', 'rocket-pool': 'RPL', 'gearbox': 'GEAR', 'yearn': 'YFI', 'liquity': 'LQTY', 'fluid': 'FLUID',
  'deepbook': 'DEEP', 'sanctum': 'CLOUD', 'axelar': 'AXL', 'notcoin': 'NOT', 'celo': 'CELO', 'moonbeam': 'GLMR', 'stader': 'SD', 'ssv-network': 'SSV', 'bouncebit': 'BB'}
def get(path):
  req = urllib.request.Request(BASE + path, headers={'user-agent': 'Vantis-unlocks/1.0'})
  with urllib.request.urlopen(req, timeout=60) as r: return json.loads(r.read())
def find_events(o, path='', out=None):
  out = [] if out is None else out
  if isinstance(o, dict):
    for k, v in o.items():
      if k == 'events' and isinstance(v, list) and v and isinstance(v[0], dict) and 'timestamp' in v[0]: out.append((path + '.' + k, v))
      else: find_events(v, path + '.' + k, out)
  elif isinstance(o, list):
    for i, v in enumerate(o[:50]): find_events(v, path + f'[{i}]', out)
  return out
now = time.time(); lo, hi = now - 2 * 86400, now + 150 * 86400
slugs = set(get('/emissionsProtocolsList')); out = []; done = []
for slug, sym in MAP.items():
  if slug not in slugs: continue
  try: d = get('/emissions/' + slug)
  except Exception as e: print('fout', slug, e, file=sys.stderr); continue
  ev = [e for _, v in find_events(d) for e in v]
  sm = (d.get('supplyMetrics') or {}); mx = sm.get('maxSupply') or sm.get('adjustedSupply')
  try: mx = float(mx) if mx else None
  except (TypeError, ValueError): mx = None
  grp = {}
  for e in ev:
    try: t = float(e.get('timestamp') or 0)
    except (TypeError, ValueError): continue
    if not (lo <= t <= hi): continue
    if (e.get('unlockType') or 'cliff') != 'cliff': continue
    toks = e.get('noOfTokens')
    try: amt = sum(float(x) for x in toks) if isinstance(toks, list) else float(toks or 0)
    except (TypeError, ValueError): amt = 0
    if not amt and e.get('summary'): amt = float((e.get('summary') or {}).get('totalTokensCliff') or 0)
    if amt <= 0: continue
    g = grp.setdefault(int(t // 86400), {'t': t, 'tokens': 0, 'cats': set(), 'to': set()})
    g['tokens'] += amt
    if e.get('category'): g['cats'].add(e['category'])
    for al in (e.get('cliffAllocations') or []):
      if al.get('category'): g['cats'].add(al['category'])
      if al.get('recipient'): g['to'].add(al['recipient'])
    m = re.search(r'of (.+?) tokens will', e.get('description') or '')
    if m: g['to'].add(m.group(1))
  n = 0
  if len(grp) > 12: done.append(f'{sym}:doorlopend'); continue
  for g in grp.values():
    out.append({'sym': sym, 'name': d.get('name') or slug, 't': int(g['t'] * 1000), 'tokens': round(g['tokens'], 2), 'max': mx, 'cats': sorted(g['cats']), 'to': sorted(g['to'])[:4]})
    n += 1
  done.append(f'{sym}:{n}')
out.sort(key=lambda x: x['t']); out = out[:400]
payload = {'t': int(now * 1000), 'src': 'DefiLlama (open emissions dataset)', 'tokens': len(done), 'events': out}
val = json.dumps(payload, separators=(',', ':')).replace("'", "''")
open('tools/unlocks.sql', 'w').write(f"INSERT INTO kv(key,val,ts) VALUES('unlocks','{val}',{int(now*1000)}) ON CONFLICT(key) DO UPDATE SET val=excluded.val, ts=excluded.ts;\n")
print(f'{len(out)} unlocks van {len(done)} tokens:', ' '.join(done))
