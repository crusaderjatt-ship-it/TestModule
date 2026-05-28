import { useMemo, useState } from 'react';
import { Archive, BadgeDollarSign, BellRing, CheckCircle2, Clock3, Copy, Gamepad2, GitBranch, Layers3, MonitorSmartphone, Palette, RotateCcw, Save, Sparkles, Split, Upload, Wand2 } from 'lucide-react';
import { sampleFlows, sampleGames, samplePaywalls, samplePricingRules } from './sampleData';
import type { CTAStyle, Context, FlowConfig, LayoutConfig, PaywallTemplate, PricingRule, PurchaseLock, Status } from './types';
import { cents, detectPricingOverlaps, lockPriceAtCtaClick, minuteOfDay, resolveActivePricingRule } from './utils/pricing';
import { resolveActiveFlow, resolveActivePaywall, rollbackPaywallVersion, syncGlobalCtaStyle } from './utils/flow';

const builds = ['menu-2026.05', 'menu-2026.06-beta', 'kids-mode-2026'];
const brands = ['Highline', 'Lucky Lanes', 'Cinema Social'];
const locations = ['Austin Arcade', 'Denver Taproom', 'Orlando Resort'];
const nowIso = '2026-05-28T20:15:00.000Z';

type PreviewStage = 'menu' | 'paywall' | 'confirmation' | 'purchased';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'purple' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Panel({ title, eyebrow, icon, children }: { title: string; eyebrow?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-title"><div>{eyebrow && <p>{eyebrow}</p>}<h2>{icon}{title}</h2></div></div>{children}</section>;
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)} type="button"><span />{label}</button>;
}

function updateLayout<K extends keyof LayoutConfig>(paywall: PaywallTemplate, key: K, value: LayoutConfig[K]): PaywallTemplate {
  return { ...paywall, updatedAt: new Date().toISOString(), layout: { ...paywall.layout, [key]: value } };
}

function updateCta<K extends keyof CTAStyle>(paywall: PaywallTemplate, key: K, value: CTAStyle[K]): PaywallTemplate {
  return { ...paywall, layout: { ...paywall.layout, cta: { ...paywall.layout.cta, [key]: value } } };
}

function buttonStyle(style: CTAStyle): React.CSSProperties {
  return {
    width: style.width,
    height: style.height,
    borderRadius: style.shape === 'pill' ? 999 : style.shape === 'rounded' ? 16 : 4,
    background: style.gradient || style.fill,
    color: style.textColor,
    border: style.border,
    fontFamily: style.fontFamily,
    fontSize: style.size,
    fontWeight: style.weight,
    boxShadow: style.states.default.shadow
  };
}

function TemplateCard({ paywall, selected, onSelect, onDuplicate, onStatus, onRollback }: { paywall: PaywallTemplate; selected: boolean; onSelect: () => void; onDuplicate: () => void; onStatus: (status: Status) => void; onRollback: () => void }) {
  return <article className={`template-card ${selected ? 'selected' : ''}`} onClick={onSelect}>
    <div><h3>{paywall.name}</h3><p>v{paywall.currentVersion} · {paywall.assignments.trafficSplit}% split · {paywall.assignments.brands.join(', ') || 'All brands'}</p></div>
    <div className="metrics"><Badge tone={paywall.status === 'published' ? 'green' : paywall.status === 'draft' ? 'amber' : 'red'}>{paywall.status}</Badge><span>{paywall.metrics.conversionRate}% CVR</span><span>${paywall.metrics.revenuePerSession.toFixed(2)} RPS</span></div>
    <div className="card-actions"><button type="button" onClick={(event) => { event.stopPropagation(); onDuplicate(); }}><Copy size={14}/>Duplicate</button><button type="button" onClick={(event) => { event.stopPropagation(); onStatus(paywall.status === 'published' ? 'draft' : 'published'); }}><Save size={14}/>{paywall.status === 'published' ? 'Draft' : 'Publish'}</button><button type="button" onClick={(event) => { event.stopPropagation(); onRollback(); }}><RotateCcw size={14}/>Rollback</button><button type="button" onClick={(event) => { event.stopPropagation(); onStatus('archived'); }}><Archive size={14}/>Archive</button></div>
  </article>;
}

function DevicePreview({ paywall, flow, priceLabel, stage, setStage, lock, onLock }: { paywall: PaywallTemplate; flow: FlowConfig; priceLabel: string; stage: PreviewStage; setStage: (stage: PreviewStage) => void; lock?: PurchaseLock; onLock: () => void }) {
  const layout = stage === 'confirmation' ? paywall.confirmation : paywall.layout;
  const screenStyle: React.CSSProperties = {
    backgroundImage: `${layout.gradient === 'dark' ? 'linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.85)),' : layout.gradient === 'light' ? 'linear-gradient(180deg,rgba(255,255,255,.42),rgba(255,255,255,.1)),' : layout.gradient === 'brand' ? 'linear-gradient(135deg,rgba(124,58,237,.56),rgba(14,165,233,.38)),' : ''} url(${layout.backgroundRef})`,
    backgroundSize: layout.scaling === 'custom' ? `${layout.zoom}%` : layout.scaling,
    backgroundPosition: `${50 + layout.x}% ${50 + layout.y}%`,
    filter: `none`
  };
  return <div className="device"><div className="device-top"><span /><strong>Tabletop Preview</strong><span /></div><div className="screen" style={screenStyle}>
    <div className="overlay" style={{ backdropFilter: `blur(${layout.blur}px)`, background: `rgba(2,6,23,${layout.overlayOpacity / 100})` }} />
    {stage === 'menu' && <div className="menu-preview"><div className="preview-header"><Badge tone="purple">{flow.name}</Badge><button type="button" onClick={() => setStage('paywall')}>Open paywall</button></div><h3>Choose a game</h3><div className={`game-grid ${flow.home.layout}`}>{sampleGames.map((game) => <button className="game-tile" key={game.id} style={{ background: game.art }} onClick={() => setStage(flow.tileClickBehavior === 'game info page' ? 'paywall' : 'confirmation')}><strong>{game.title}</strong><small>{game.category}</small></button>)}</div>{flow.home.featuredRows && <div className="featured-row">Featured row · arrows {flow.home.arrows ? 'on' : 'off'} · categories {flow.home.categories ? 'on' : 'off'}</div>}<button className="bottom-floating" style={buttonStyle(paywall.layout.bottomCta)} onClick={() => setStage(flow.bottomCtaBehavior === 'full paywall' ? 'paywall' : 'confirmation')}>{paywall.layout.bottomCta.text}</button></div>}
    {stage === 'paywall' && <div className="paywall-preview"><button className="close">×</button><Badge tone="green">Active price {priceLabel}</Badge><h1 style={{ fontSize: layout.headlineSize, textShadow: layout.textShadow ? '0 4px 20px #000' : 'none' }}>{layout.headline}</h1><p>{layout.subtext}</p><strong className="price">{layout.priceLabel.replace('{price}', priceLabel)}</strong><button type="button" style={buttonStyle(layout.cta)} onClick={onLock}>{layout.cta.text}</button>{layout.bottomPlayButton && <button className="ghost" onClick={() => setStage('menu')}>Play Games</button>}</div>}
    {stage === 'confirmation' && <div className="paywall-preview confirmation">{paywall.confirmation.confetti && <div className="confetti">✦ ✹ ✧ ✦</div>}<Badge tone="amber">{paywall.confirmation.transition} transition</Badge><h1 style={{ fontSize: layout.headlineSize }}>{layout.headline}</h1><p>{layout.subtext}</p><strong className="price">{layout.priceLabel.replace('{price}', lock ? cents(lock.priceCents, lock.currency) : priceLabel)}</strong><button style={buttonStyle(layout.cta)} onClick={() => setStage('purchased')}>{layout.cta.text}</button>{paywall.confirmation.secondaryCancel && <button className="ghost" onClick={() => setStage('menu')}>Cancel</button>}</div>}
    {stage === 'purchased' && <div className="paywall-preview purchased"><CheckCircle2 size={64}/><h1>Purchase locked</h1><p>Charged price uses the CTA-click lock, even if schedules change before payment.</p><strong>{lock ? cents(lock.priceCents, lock.currency) : priceLabel}</strong><button className="ghost" onClick={() => setStage('menu')}>Back to menu</button></div>}
  </div><div className="device-status"><span>Flow: {flow.id}</span><span>Paywall: {paywall.id}</span><span>Lock: {lock ? cents(lock.priceCents, lock.currency) : 'none'}</span></div></div>;
}

export default function App() {
  const [paywalls, setPaywalls] = useState<PaywallTemplate[]>(() => samplePaywalls.map((paywall) => ({ ...paywall, versions: paywall.versions.length ? paywall.versions : [{ version: 1, createdAt: paywall.createdAt, note: 'Initial import', layout: clone(paywall.layout), status: 'draft' }, { version: paywall.currentVersion, createdAt: paywall.updatedAt, note: 'Published summer promo', layout: clone(paywall.layout), status: paywall.status }] })));
  const [flows, setFlows] = useState<FlowConfig[]>(sampleFlows);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>(samplePricingRules);
  const [selectedPaywallId, setSelectedPaywallId] = useState(paywalls[0].id);
  const [selectedFlowId, setSelectedFlowId] = useState(flows[1]?.id ?? flows[0].id);
  const [context, setContext] = useState({ build: builds[0], brand: brands[0], location: locations[0], now: nowIso });
  const [stage, setStage] = useState<PreviewStage>('menu');
  const [lock, setLock] = useState<PurchaseLock | undefined>();

  const runtimeContext: Context = useMemo(() => ({ ...context, now: new Date(context.now) }), [context]);
  const selectedPaywall = paywalls.find((paywall) => paywall.id === selectedPaywallId) ?? paywalls[0];
  const selectedFlow = flows.find((flow) => flow.id === selectedFlowId) ?? flows[0];
  const activeFlow = resolveActiveFlow(flows, runtimeContext);
  const activePaywall = resolveActivePaywall(paywalls, runtimeContext, selectedFlow.perGamePaywalls['galaxy-karts']);
  const activePrice = resolveActivePricingRule(pricingRules, runtimeContext);
  const overlaps = detectPricingOverlaps(pricingRules);

  const patchSelectedPaywall = (updater: (paywall: PaywallTemplate) => PaywallTemplate) => setPaywalls((items) => items.map((item) => item.id === selectedPaywall.id ? updater(item) : item));
  const patchSelectedFlow = (updater: (flow: FlowConfig) => FlowConfig) => setFlows((items) => items.map((item) => item.id === selectedFlow.id ? updater(item) : item));

  const createPaywall = () => {
    const base = clone(selectedPaywall);
    const next = { ...base, id: `paywall-${Date.now()}`, name: `${base.name.replace(/ v\d+$/, '')} v${base.currentVersion + 1}`, status: 'draft' as Status, currentVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), versions: [{ version: 1, createdAt: new Date().toISOString(), note: 'Created from builder', layout: base.layout, status: 'draft' as Status }] };
    setPaywalls((items) => [next, ...items]);
    setSelectedPaywallId(next.id);
  };

  const lockCurrentPrice = () => {
    setLock(lockPriceAtCtaClick(activePrice.rule, activePrice.priceCents, activePrice.currency));
    setStage(selectedFlow.confirmation.enabled ? 'confirmation' : 'purchased');
  };

  return <main className="app-shell">
    <header className="hero"><div><Badge tone="purple"><Gamepad2 size={14}/> Game Module</Badge><h1>Paywall, flow, and pricing operations console</h1><p>Replace the AI Trend Radar placeholder with an end-to-end React/Vite admin app for game menu monetization, local JSON persistence, and previewable purchase journeys.</p></div><div className="hero-actions"><button type="button" onClick={createPaywall}><Wand2 size={16}/>New template</button><button type="button" onClick={() => patchSelectedPaywall((paywall) => ({ ...paywall, status: 'published', currentVersion: paywall.currentVersion + 1, versions: [...paywall.versions, { version: paywall.currentVersion + 1, createdAt: new Date().toISOString(), note: 'Published from console', layout: clone(paywall.layout), status: 'published' }] }))}><Upload size={16}/>Publish version</button></div></header>

    <section className="context-bar"><Field label="Build"><select value={context.build} onChange={(e) => setContext({ ...context, build: e.target.value })}>{builds.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Brand"><select value={context.brand} onChange={(e) => setContext({ ...context, brand: e.target.value })}>{brands.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Location"><select value={context.location} onChange={(e) => setContext({ ...context, location: e.target.value })}>{locations.map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Simulated time"><input type="datetime-local" value={context.now.slice(0, 16)} onChange={(e) => setContext({ ...context, now: new Date(e.target.value).toISOString() })}/></Field><div className="active-stack"><Badge tone="green">Active flow {activeFlow.name}</Badge><Badge tone="blue">Active paywall {activePaywall.name}</Badge><Badge tone="amber">Active schedule minute {minuteOfDay(runtimeContext.now)}</Badge></div></section>

    <div className="workspace">
      <div className="left-column">
        <Panel title="Template system" eyebrow="Create · duplicate · archive · rollback" icon={<Layers3 size={20}/>}>{paywalls.map((paywall) => <TemplateCard key={paywall.id} paywall={paywall} selected={paywall.id === selectedPaywall.id} onSelect={() => setSelectedPaywallId(paywall.id)} onDuplicate={() => { const next = { ...clone(paywall), id: `paywall-copy-${Date.now()}`, name: `${paywall.name} Copy`, status: 'draft' as Status }; setPaywalls([next, ...paywalls]); }} onStatus={(status) => setPaywalls(paywalls.map((item) => item.id === paywall.id ? { ...item, status } : item))} onRollback={() => setPaywalls(paywalls.map((item) => item.id === paywall.id ? rollbackPaywallVersion(item, item.versions[0]?.version ?? 1) : item))}/> )}</Panel>

        <Panel title="Paywall builder" eyebrow="Assets · typography · CTA states" icon={<Palette size={20}/>}> 
          <div className="builder-grid"><Field label="Template name"><input value={selectedPaywall.name} onChange={(e) => patchSelectedPaywall((p) => ({ ...p, name: e.target.value }))}/></Field><Field label="Background / asset URL"><input value={selectedPaywall.layout.backgroundRef} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'backgroundRef', e.target.value))}/></Field><Field label="Asset type"><select value={selectedPaywall.layout.assetType} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'assetType', e.target.value as LayoutConfig['assetType']))}>{['PNG','JPG','GIF','MP4'].map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Scaling"><select value={selectedPaywall.layout.scaling} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'scaling', e.target.value as LayoutConfig['scaling']))}>{['cover','contain','custom'].map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Custom zoom"><input type="range" min="50" max="180" value={selectedPaywall.layout.zoom} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'zoom', Number(e.target.value)))}/></Field><Field label="X / Y position"><div className="split-input"><input type="number" value={selectedPaywall.layout.x} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'x', Number(e.target.value)))}/><input type="number" value={selectedPaywall.layout.y} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'y', Number(e.target.value)))}/></div></Field><Field label="Overlay opacity"><input type="range" min="0" max="90" value={selectedPaywall.layout.overlayOpacity} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'overlayOpacity', Number(e.target.value)))}/></Field><Field label="Blur"><input type="range" min="0" max="12" value={selectedPaywall.layout.blur} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'blur', Number(e.target.value)))}/></Field><Field label="Gradient"><select value={selectedPaywall.layout.gradient} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'gradient', e.target.value as LayoutConfig['gradient']))}>{['none','dark','light','brand'].map((type) => <option key={type}>{type}</option>)}</select></Field></div>
          <div className="builder-grid"><Field label="Headline"><input value={selectedPaywall.layout.headline} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'headline', e.target.value))}/></Field><Field label="Subtext"><input value={selectedPaywall.layout.subtext} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'subtext', e.target.value))}/></Field><Field label="Price display"><input value={selectedPaywall.layout.priceLabel} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'priceLabel', e.target.value))}/></Field><Field label="Headline size"><input type="range" min="24" max="64" value={selectedPaywall.layout.headlineSize} onChange={(e) => patchSelectedPaywall((p) => updateLayout(p, 'headlineSize', Number(e.target.value)))}/></Field><Toggle label="Shadow" checked={selectedPaywall.layout.textShadow} onChange={(value) => patchSelectedPaywall((p) => updateLayout(p, 'textShadow', value))}/><Toggle label="Glow" checked={selectedPaywall.layout.glow} onChange={(value) => patchSelectedPaywall((p) => updateLayout(p, 'glow', value))}/><Toggle label="Close button" checked={selectedPaywall.layout.closeButton} onChange={(value) => patchSelectedPaywall((p) => updateLayout(p, 'closeButton', value))}/><Toggle label="Bottom Play Games" checked={selectedPaywall.layout.bottomPlayButton} onChange={(value) => patchSelectedPaywall((p) => updateLayout(p, 'bottomPlayButton', value))}/></div>
          <h3>CTA styling controls</h3><div className="builder-grid"><Field label="CTA text"><input value={selectedPaywall.layout.cta.text} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'text', e.target.value))}/></Field><Field label="Font size"><input type="range" min="11" max="26" value={selectedPaywall.layout.cta.size} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'size', Number(e.target.value)))}/></Field><Field label="Weight"><input type="range" min="400" max="900" step="100" value={selectedPaywall.layout.cta.weight} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'weight', Number(e.target.value)))}/></Field><Field label="Shape"><select value={selectedPaywall.layout.cta.shape} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'shape', e.target.value as CTAStyle['shape']))}>{['pill','rounded','square'].map((shape) => <option key={shape}>{shape}</option>)}</select></Field><Field label="Dimensions"><div className="split-input"><input type="number" value={selectedPaywall.layout.cta.width} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'width', Number(e.target.value)))}/><input type="number" value={selectedPaywall.layout.cta.height} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'height', Number(e.target.value)))}/></div></Field><Field label="Placement"><div className="split-input"><input type="number" value={selectedPaywall.layout.cta.x} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'x', Number(e.target.value)))}/><input type="number" value={selectedPaywall.layout.cta.y} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'y', Number(e.target.value)))}/></div></Field><Field label="Fill"><input type="color" value={selectedPaywall.layout.cta.fill} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'fill', e.target.value))}/></Field><Field label="Text color"><input type="color" value={selectedPaywall.layout.cta.textColor} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'textColor', e.target.value))}/></Field><Field label="Gradient"><input value={selectedPaywall.layout.cta.gradient} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'gradient', e.target.value))}/></Field><Field label="Border"><input value={selectedPaywall.layout.cta.border} onChange={(e) => patchSelectedPaywall((p) => updateCta(p, 'border', e.target.value))}/></Field><button type="button" className="wide" onClick={() => patchSelectedPaywall(syncGlobalCtaStyle)}><Split size={16}/>Apply CTA styling globally</button></div>
        </Panel>

        <Panel title="Confirmation screen builder" eyebrow="Mirrored layout with purchase consent controls" icon={<BellRing size={20}/>}> <div className="builder-grid"><Field label="Headline"><input value={selectedPaywall.confirmation.headline} onChange={(e) => patchSelectedPaywall((p) => ({ ...p, confirmation: { ...p.confirmation, headline: e.target.value } }))}/></Field><Field label="Transition"><select value={selectedPaywall.confirmation.transition} onChange={(e) => patchSelectedPaywall((p) => ({ ...p, confirmation: { ...p.confirmation, transition: e.target.value as PaywallTemplate['confirmation']['transition'] } }))}>{['fade','slide','zoom','arcade'].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Auto-close seconds"><input type="number" value={selectedPaywall.confirmation.autoCloseSeconds} onChange={(e) => patchSelectedPaywall((p) => ({ ...p, confirmation: { ...p.confirmation, autoCloseSeconds: Number(e.target.value) } }))}/></Field><Toggle label="Confetti" checked={selectedPaywall.confirmation.confetti} onChange={(value) => patchSelectedPaywall((p) => ({ ...p, confirmation: { ...p.confirmation, confetti: value } }))}/><Toggle label="Secondary cancel CTA" checked={selectedPaywall.confirmation.secondaryCancel} onChange={(value) => patchSelectedPaywall((p) => ({ ...p, confirmation: { ...p.confirmation, secondaryCancel: value } }))}/></div></Panel>
      </div>

      <div className="right-column">
        <Panel title="Live purchase preview" eyebrow="High engagement simulation" icon={<MonitorSmartphone size={20}/>}> <div className="stage-tabs">{(['menu','paywall','confirmation','purchased'] as PreviewStage[]).map((tab) => <button className={stage === tab ? 'active' : ''} key={tab} onClick={() => setStage(tab)}>{tab}</button>)}</div><DevicePreview paywall={selectedPaywall} flow={selectedFlow} priceLabel={cents(activePrice.priceCents, activePrice.currency)} stage={stage} setStage={setStage} lock={lock} onLock={lockCurrentPrice}/></Panel>

        <Panel title="Flow builder" eyebrow="Order · visibility · trigger conditions" icon={<GitBranch size={20}/>}> <Field label="Selected flow"><select value={selectedFlow.id} onChange={(e) => setSelectedFlowId(e.target.value)}>{flows.map((flow) => <option key={flow.id} value={flow.id}>{flow.name}</option>)}</select></Field><div className="flow-list">{selectedFlow.screenOrder.map((screen, index) => <div key={screen}><strong>{index + 1}. {screen}</strong><Toggle label="visible" checked={selectedFlow.visibility[screen]} onChange={(value) => patchSelectedFlow((flow) => ({ ...flow, visibility: { ...flow.visibility, [screen]: value } }))}/></div>)}</div><div className="builder-grid"><Toggle label="Entry full-screen paywall" checked={selectedFlow.entryFullScreenPaywall} onChange={(value) => patchSelectedFlow((flow) => ({ ...flow, entryFullScreenPaywall: value }))}/><Toggle label="Global confirmation" checked={selectedFlow.confirmation.enabled} onChange={(value) => patchSelectedFlow((flow) => ({ ...flow, confirmation: { ...flow.confirmation, enabled: value } }))}/><Field label="CTA destination"><select value={selectedFlow.ctaDestination} onChange={(e) => patchSelectedFlow((flow) => ({ ...flow, ctaDestination: e.target.value as FlowConfig['ctaDestination'] }))}>{['purchase','confirmation','home','custom-route'].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Bottom CTA behavior"><select value={selectedFlow.bottomCtaBehavior} onChange={(e) => patchSelectedFlow((flow) => ({ ...flow, bottomCtaBehavior: e.target.value as FlowConfig['bottomCtaBehavior'] }))}>{['immediate purchase','confirmation screen','full paywall','custom route'].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Tile click behavior"><select value={selectedFlow.tileClickBehavior} onChange={(e) => patchSelectedFlow((flow) => ({ ...flow, tileClickBehavior: e.target.value as FlowConfig['tileClickBehavior'] }))}>{['confirmation screen','game info page','game-specific paywall'].map((value) => <option key={value}>{value}</option>)}</select></Field><Toggle label="Game info page" checked={selectedFlow.gameInfo.enabled} onChange={(value) => patchSelectedFlow((flow) => ({ ...flow, gameInfo: { ...flow.gameInfo, enabled: value } }))}/><Toggle label="Categories" checked={selectedFlow.home.categories} onChange={(value) => patchSelectedFlow((flow) => ({ ...flow, home: { ...flow.home, categories: value } }))}/><Toggle label="Arrows" checked={selectedFlow.home.arrows} onChange={(value) => patchSelectedFlow((flow) => ({ ...flow, home: { ...flow.home, arrows: value } }))}/></div><div className="game-assignments">{sampleGames.map((game) => <div key={game.id}><span>{game.title}</span><select value={selectedFlow.perGamePaywalls[game.id] ?? ''} onChange={(e) => patchSelectedFlow((flow) => ({ ...flow, perGamePaywalls: { ...flow.perGamePaywalls, [game.id]: e.target.value } }))}><option value="">Default paywall</option>{paywalls.map((paywall) => <option value={paywall.id} key={paywall.id}>{paywall.name}</option>)}</select></div>)}</div></Panel>

        <Panel title="Dynamic pricing & scheduling" eyebrow="Single source of truth for display and charge" icon={<BadgeDollarSign size={20}/>}> <div className="price-summary"><h3>{cents(activePrice.priceCents, activePrice.currency)}</h3><p>{activePrice.label} · rule {activePrice.rule?.id ?? 'fallback'} · POS mode {activePrice.rule?.posMode ?? 'fallback'}</p><button onClick={lockCurrentPrice}><Clock3 size={16}/>Lock price at CTA click</button></div>{overlaps.length > 0 && <div className="warning"><strong>Overlap safeguards</strong>{overlaps.map((overlap) => <span key={`${overlap.a}-${overlap.b}`}>{overlap.a} overlaps {overlap.b}: {overlap.reason}</span>)}</div>}<div className="pricing-list">{pricingRules.map((rule) => <article key={rule.id}><div><strong>{rule.name}</strong><p>{rule.startMinute}–{rule.endMinute} min · priority {rule.priority}</p></div><input type="number" value={rule.priceCents} onChange={(e) => setPricingRules(pricingRules.map((item) => item.id === rule.id ? { ...item, priceCents: Number(e.target.value) } : item))}/><Toggle label="active" checked={rule.active} onChange={(value) => setPricingRules(pricingRules.map((item) => item.id === rule.id ? { ...item, active: value } : item))}/></article>)}</div></Panel>
      </div>
    </div>
  </main>;
}
