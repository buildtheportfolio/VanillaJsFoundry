(function () {
  'use strict';

  /* ---------- Word lists (inline, no network) ---------- */
  var ANSWER_TEXT =
    'about above abuse actor adapt admit adopt adult after again agent agree ahead alarm album alert alike alive allow alone along alter among angel anger angle angry apart apple apply arena argue arise armor array arrow aside asset audio avoid award aware awful ' +
    'bacon badge baker basic basin basis beach beard beast begin being belly below bench berry birth black blade blame blank blast blaze bleed blend bless blind block blood bloom board boast boost booth bound brain brake brand brave bread break breed brick bride brief bring broad broke brown brush build bunch burst buyer ' +
    'cabin cable camel candy canoe carry carve catch cause chain chair chalk charm chart chase cheap check cheek cheer chess chest chief child chill chose civil claim class clean clear clerk click cliff climb clock close cloth cloud clown coach coast color couch could count court cover crack craft crane crash crawl crazy cream crime crisp cross crowd crown crush curve cycle ' +
    'daily dairy dance death debut decay delay dense depth diary dirty dizzy donor doubt dozen draft drain drama drank dream dress dried drift drill drink drive drown dryer dwarf ' +
    'eager eagle early earth eight elbow elder elect elite empty enemy enjoy enter entry equal error essay event every exact exist extra ' +
    'fable faint fairy faith false fancy fatal fault feast fence fever fiber field fifth fifty fight final first flame flash fleet flesh float flock flood floor flour fluid flute focus force forge forth forty forum found frame fraud fresh front frost fruit funny ' +
    'giant given glass globe glory glove going grace grade grain grand grant grape graph grasp grass grave great green greet grief grill grind gross group grove grown guard guess guest guide guilt ' +
    'habit happy harsh haste haunt heart heavy hedge hello hence honey honor horse hotel house human humor hurry ' +
    'ideal image imply index inner input irony issue ivory ' +
    'jelly jewel joint joker judge juice jumbo ' +
    'kayak knack knife knock known ' +
    'label labor large laser later laugh layer learn lease least leave legal lemon level lever light limit linen liver lobby local logic loose lucky lunch lyric ' +
    'magic major maker maple march match maybe mayor meant medal media melon mercy merge merit metal meter might minor minus mixed model money month moral motor mount mouse mouth movie music ' +
    'naive nasty naval nerve never newly night noble noise north novel nurse nylon ' +
    'oasis occur ocean offer often olive onion opera orbit order organ other ought outer owner oxide ' +
    'paint panel panic paper party pasta patch pause peace peach pearl pedal penny phase phone photo piano piece pilot pinch pitch pizza place plain plane plant plate plaza point polar porch pound power press price pride prime print prior prize proof proud prove pulse punch pupil purse ' +
    'queen query quest quick quiet quilt quite quote ' +
    'radar radio raise rally ranch range rapid ratio reach react ready realm rebel refer relax reply rider ridge rifle right rigid river roast robot rocky rough round route royal rural ' +
    'salad sandy sauce scale scare scene scope score scout sense serve seven shade shake shall shape share sharp sheep sheet shelf shell shift shine shirt shock shoot shore short shout sight silly since sixth skill skirt sleep slice slide slope small smart smell smile smoke snake solar solid solve sorry sound south space spare speak speed spell spend spice spoon sport spray squad stack staff stage stair stake stamp stand stare start state steak steam steel steep stick still stock stone stood store storm story stove strap straw strip stuck study stuff style sugar suite sunny super sweet swept swift swing sword ' +
    'table taste teach teeth thank theme there thick thing think third thorn those three throw thumb tiger tight timer tired title toast today tooth topic total touch tough towel tower toxic trace track trade trail train trash treat trend trial tribe trick troop truck truly trump trunk trust truth tulip twice twist ' +
    'ultra uncle under union unite unity until upper upset urban usage usual ' +
    'valid value vapor vault venue verse video vigor villa vinyl viral virus visit vital vivid vocal voice voter ' +
    'wagon waist waste watch water weary weave weigh weird whale wheat wheel where which while white whole whose widen wider widow width woman world worry worse worst worth would wound woven wrist write wrong ' +
    'yacht yield young youth zebra';

  var EXTRA_TEXT =
    'aback abase abate abbey abbot abhor abide abler abode abort acorn acrid acute adage adept adieu admin adobe adore adorn affix afire afoot afoul agate agile aging aglow agony aisle alibi alien align alley allot alloy aloft aloha aloof altar amass amaze amber amble amend ample amply amuse anchor angst anime ankle annex annoy annul anode antic anvil aorta apart aphid aping apron aptly arbor ardor arise aroma arson artsy ashen ashes askew assay atlas atoll atone attic audit augur aunty avail avert avian avoid await awake awash axiom azure ' +
    'badly baggy bagel balmy banal bandy banjo barge baron basil basso baste batch bathe baton batty bawdy bayou beady beefy befit began beget beige belch belie belle belt bendy berth beset betel bevel bible bicep bigot bilge billy binge bingo biome birch bison bitty blimp bliss bloat bluer bluff blunt blurb blurt blush boggy bogus boner bonus booby booty booze borax bosom bossy botch bough bowel boxer brace braid brash brass brawl brawn bribe brine brink brisk broil brood brook broom broth brunt brute buddy budge buggy bugle bulge bulky bully bumpy burly burnt burro bushy butch butte buxom bylaw ' +
    'cacao cache cadet cagey cairn calve camel cameo canal candid canny caper carat cargo carol carry caste cater cavil cease cedar chafe chaff chant chaos chaps charm chasm cheat chide chimp china chirp choir choke chord chore chuck chump chunk churn chute cider cigar cinch circa civic clack clamp clang clank clash clasp claw clave clean cleat cleft clerk clime cling clink cloak clone cloth clout clove clump clung coach cobra cocoa comet comic comma conch condo coral corny corps couch cough coupe coyly cramp crank crate crave crazy creak credo creed creek creep crepe crept cress crest crick cried crimp crook croon crude cruel crumb cruse crust crypt cubic cumin curio curly curry curse curvy cutie cynic ' +
    'dado daddy daily daisy dally dandy datum daunt dealt debit debug decal decor decoy decry deign deity delta delve demon demur denim depot derby deter detox deuce devil diner dingo dingy diode dirge disco ditch ditto ditty diver dodge dodgy dogma doing dolly donut dopey doubt dough dowdy dowel downy dowry drape drawl drawn dread dregs drier droll drone drool droop dross drove drunk dryly duchy dully dummy dumpy dunce dusky dusty dutch duvet dwell dwelt dying ' +
    'eagle earls early earns easel eaten eater eaves ebony eclat edict edify eerie egret eject elate elegy elfin elude elves email embed ember emcee emend emote endow enema ensue envoy epoch epoxy equip erase erect erode erupt essay ether ethic ethos evade evict evoke exalt excel exert exile expel extol exude exult ' +
    'fanny farce fatty fauna favor feign feint fella felon femur ferry fetal fetch fetid fetus feud fewer fiend filer filet filly filmy filth finch finer finny fiord fixer fizzy fjord flack flail flair flake flaky flank flare flask flaunt fleck flick flier fling flint flirt flits floss flown fluff fluke flung flunk flush flyer foamy foggy foist folio folly foray forgo forte forth foul foyer frail frank freak freed freer fried frill frisk frock frond frown froze fugue fully fungi funky furor furry fussy fuzzy ' +
    'gaffe gamer gamma gamut gassy gaudy gauge gaunt gauze gavel gawky gayer gecko geeky geese genie genre ghost ghoul giddy girly girth given gizmo glade gland glare glaze gleam glean glide glint gloat gloom glossy glyph gnash gnome godly golem goner goody gooey goofy goose gorge gouge gourd grail grate gravy graze greed greedy grime grimy grind gripe groan groin groom grope grout growl gruel gruff grunt guava guile guise gulch gully gumbo gummy guppy gusto gusty gypsy ' +
    'hairy halve handy hardy harem harpy hazel heady heard heath heave hefty heist helix hinge hippo hippy hitch hoard hobby hoist holly homer hound hovel hover howdy hubby huffy hulky humid humus hunch hunky hussy hutch hydra hyena hymen hyper ' +
    'icily icing idiom idiot idler idyll igloo iliac image imbue impel imply inane inept inert infer ingot inlay inlet inane inter intro ionic irate irked islet itchy ' +
    'jaunt jazzy jerky jetty jiffy joist jolly joust judge juicy jumpy junta junto juror ' +
    'kappa karma kebab khaki kinky kiosk kitty knead kneel knelt knoll koala kudos ' +
    'labor laden ladle lager lance lanky lapel lapse larva lasso latch latte lathe laxly leafy leaky leapt leash ledge leech leery lefty legit lemur leper liege lilac limbo limey lingo lipid lithe livid llama loamy loath lodge lofty loner loopy lorry loser louse lousy lover lower lowly loyal lucid lumen lumpy lunar lunge lupus lurch lurid lusty lying lymph lynch ' +
    'macaw macho macro madam madly mafia magma maize mange mango mangy mania manic manly manor maple marsh mason masse matte mauve maxim mealy meaty mecca medic melee mercy messy midst miffy mimic mince miner minty mirth miser missy mocha modal moist molar moldy mommy moody moose moron morph mossy motel motif motto moult mound mourn mucky mulch mummy munch mural murky mushy musky musty myrrh ' +
    'nadir naked nanny nasal natal needy neigh nerdy newer newsy nicer niche niece nifty ninja ninny ninth nippy nitro nobly nomad noose notch nubby nudge nutty nymph ' +
    'oaken oaths oddly offal ogled ombre omega onset oozed opine opium optic orate ounce outdo outgo ovary ovate overt ovoid owing owned oxbow ozone ' +
    'paddy pagan paler palsy panda pansy pants papal parka parry parse pasty patio patsy patty payee peaky pecan penal pence peony perch peril perky pesky pesto petal petty phony photo piety piggy pique pithy pivot pixel pixie pizza plaid plait plank plead pleat plied plods plumb plume plump plunk plush poach poesy poise poker polka polyp pooch poppy porky posse pouch pouty prank prawn preen prick prime privy prong prone prose prowl proxy prude prune psalm pudgy puffy pulpy punky puppy purge pushy putty pygmy ' +
    'quack quaff quail quake qualm quart quash quasi queer quell queue quill quirk quota ' +
    'rabbi rabid racer radii radix rainy raise rajah ramen ranch randy raspy ratty raven rayon razor realm rebus rebut recap recur recut reedy refit regal rehab reign relic remit renal renew repay repel rerun resin retch retro reuse revel revue rhino rhyme rinse ripen risen risky ritzy rival riven rivet roach roamer robin rodeo rogue roomy roost rotor rouge rouse roust rowdy ruddy ruder rugby ruler rumba rumor rupee rusty ' +
    'sabre sadly safer sager saint saith salon salsa salty salve salvo sandy sappy sassy satin satyr saucy sauna saute savor savvy scald scalp scaly scamp scant scarf scary scene scent schwa scion scoff scold scone scoop scoot scorn scour scowl scram scrap scree screw scrub scrum sedan seedy segue seize semen sepia serum setup sever sewer shack shady shaft shaky shale shaly shank shard shave shawl sheen sheer shied shiny shire shoal shoddy shone shook shoal shove shown showy shrew shrub shrug shuck shunt shyly sided siege sieve sight sigma silky silty since sinew singe siren sissy skate skimp skied skier skiff skimp skulk skull skunk slack slain slang slant slash slate slave sleek sleet slept slick slime slimy sling slink sloop slosh sloth slump slung slunk slurp slush slyly smack smash smear smelt smirk smite smith smock smoky smote snack snafu snail snare snarl sneak sneer snide sniff snipe snobs snoop snore snort snout snowy snuck snuff soapy sober soggy solve sonar sonic sooth sooty soppy sorer sower spade spank spasm spawn spear speck spied spiel spike spiky spill spilt spine spiny spire spite splat split spoil spoke spoof spook spool spore spout spree sprig spunk spurn spurt squat squib stack staid stain stale stalk stall stand stank stark stash stave stead steed steer stein stern stews stiff stilt sting stink stint stoic stoke stole stomp stony stool stoop storm stout strew stride strut stump stung stunk stunt suave suede sulky sully sumac sunup surer surge surly sushi swami swamp swarm swash swath swear sweat swell swill swine swipe swirl swish swoon swoop swore sworn swung synod syrup ' +
    'tabby taboo tacit tacky taffy taint taken taker tally talon tamer tango tangy taper tapir tardy tarot tarry taunt tawny teary tease teddy tempo tenet tenor tense tepee tepid terra terse testy thaw thick thief thigh thine thong thorn threw tibia tidal tilde timid tinge tipsy titan tithe toady toast today token tonal tonic toots topaz torch torso torus totem touch toxin trait tramp trawl tread tress triad trike trill tripe trite troll tromp trope trout trove truce trump tryst tubal tuber tunic turbo tutor twang tweak tweed tweet twerp twine twirl twixt tying ' +
    'udder ulcer umbra unarm unbar unbox uncut under undid undue unfed unfit unify unlit unmet unset untie unwed unzip upend uplit upon urged urine usher using usurp utter ' +
    'vague valet valor valve vegan venom verge verve vicar video vigil vista vixen vodka vogue vomit vouch vowel vying ' +
    'wacky wader wafer waged wager wahoo waltz warty washy wasps watery waver waxen weedy weepy weigh welsh wench whack whale wharf wheel whelp whiff whine whirl whisk whoop widen wield wimpy wince winch windy wiser wispy witch witty wives wizen woken woody wordy wormy wrack wrath wreak wreck wrest wring wryly ' +
    'xenon yearn yeast yield yodel yokel young yummy zesty zingy zippy zonal';

  function parse(text) {
    var seen = {}, out = [];
    text.split(/\s+/).forEach(function (w) {
      if (/^[a-z]{5}$/.test(w) && !seen[w]) { seen[w] = true; out.push(w); }
    });
    return out;
  }
  var ANSWERS = parse(ANSWER_TEXT);
  var VALID = {};
  ANSWERS.forEach(function (w) { VALID[w] = true; });
  parse(EXTRA_TEXT).forEach(function (w) { VALID[w] = true; });

  /* ---------- Constants & helpers ---------- */
  var ROWS = 6, COLS = 5, FLIP_MS = 300;
  var KEY_ROWS = ['qwertyuiop', 'asdfghjkl', '+zxcvbnm-'];
  var EPOCH_DAYS = 19000; // days since 1970-01-01 baseline for puzzle numbering (2022-01-08)

  function $(id) { return document.getElementById(id); }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var storageOk = true;
  var mem = {};
  function sGet(k) {
    try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) { storageOk = false; }
    return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
  }
  function sSet(k, v) {
    mem[k] = v;
    try { localStorage.setItem(k, v); } catch (e) { storageOk = false; }
  }
  function load(k, fallback) {
    var raw = sGet(k);
    if (!raw) return fallback;
    try { var v = JSON.parse(raw); return v && typeof v === 'object' ? v : fallback; } catch (e) { return fallback; }
  }

  function dayNumber(d) {
    d = d || new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function dailyWord(day) {
    var n = ANSWERS.length, step = 97;
    while (gcd(step, n) !== 1) step++;
    var i = (((day - EPOCH_DAYS) * step) % n + n) % n;
    return ANSWERS[i];
  }
  function puzzleNo(day) { return day - EPOCH_DAYS; }

  function score(guess, answer) {
    var res = ['absent', 'absent', 'absent', 'absent', 'absent'], left = {}, i;
    for (i = 0; i < COLS; i++) {
      if (guess[i] === answer[i]) res[i] = 'correct';
      else left[answer[i]] = (left[answer[i]] || 0) + 1;
    }
    for (i = 0; i < COLS; i++) {
      if (res[i] === 'correct') continue;
      if (left[guess[i]] > 0) { res[i] = 'present'; left[guess[i]]--; }
    }
    return res;
  }
  function ordinal(n) { return n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]); }

  /* hard mode: returns an error message or null */
  function hardViolation(guess, prevGuesses, answer) {
    var need = {}, g, s, i;
    for (var p = 0; p < prevGuesses.length; p++) {
      g = prevGuesses[p]; s = score(g, answer);
      var count = {};
      for (i = 0; i < COLS; i++) {
        if (s[i] === 'correct') {
          if (guess[i] !== g[i]) return ordinal(i + 1) + ' letter must be ' + g[i].toUpperCase();
        }
        if (s[i] !== 'absent') count[g[i]] = (count[g[i]] || 0) + 1;
      }
      for (var k in count) if (count[k] > (need[k] || 0)) need[k] = count[k];
    }
    for (var l in need) {
      var have = 0;
      for (i = 0; i < COLS; i++) if (guess[i] === l) have++;
      if (have < need[l]) return 'Guess must contain ' + l.toUpperCase();
    }
    return null;
  }

  /* ---------- State ---------- */
  var settings = load('wordle.settings', { hard: false, contrast: false, theme: 'auto' });
  var stats = load('wordle.stats', null);
  if (!stats || !Array.isArray(stats.dist) || stats.dist.length !== 6) {
    stats = { played: 0, wins: 0, streak: 0, max: 0, dist: [0, 0, 0, 0, 0, 0], last: 0 };
  }
  var game = null;       // { mode, day, answer, guesses, status, hard }
  var current = '';
  var busy = false;
  var tiles = [], rows = [], keyEls = {};
  var lastResult = null; // index into dist for highlight

  function newGame(mode) {
    var day = dayNumber();
    if (mode === 'daily') {
      var saved = load('wordle.daily', null);
      var answer = dailyWord(day);
      if (saved && saved.day === day && Array.isArray(saved.guesses) && saved.guesses.every(function (g) { return typeof g === 'string' && g.length === 5; })) {
        return { mode: 'daily', day: day, answer: answer, guesses: saved.guesses.slice(0, ROWS), status: saved.status || 'playing', hard: !!saved.hard };
      }
      return { mode: 'daily', day: day, answer: answer, guesses: [], status: 'playing', hard: !!settings.hard };
    }
    var a = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    if (game && game.mode === 'practice' && ANSWERS.length > 1) { while (a === game.answer) a = ANSWERS[Math.floor(Math.random() * ANSWERS.length)]; }
    return { mode: 'practice', day: day, answer: a, guesses: [], status: 'playing', hard: !!settings.hard };
  }
  function persistGame() {
    if (game.mode !== 'daily') return;
    sSet('wordle.daily', JSON.stringify({ day: game.day, guesses: game.guesses, status: game.status, hard: game.hard }));
  }
  function persistSettings() { sSet('wordle.settings', JSON.stringify(settings)); }
  function persistStats() { sSet('wordle.stats', JSON.stringify(stats)); }

  /* ---------- Announcements & toasts ---------- */
  var liveEl = $('live');
  function announce(msg) {
    liveEl.textContent = '';
    setTimeout(function () { liveEl.textContent = msg; }, 30);
  }
  function toast(msg, ms) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    var box = $('toasts');
    box.insertBefore(el, box.firstChild);
    while (box.children.length > 3) box.removeChild(box.lastChild);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }, ms || 1800);
    announce(msg);
  }

  /* ---------- Board ---------- */
  var STATE_WORD = { correct: 'correct', present: 'in word, wrong spot', absent: 'not in word' };
  function buildBoard() {
    var board = $('board');
    board.textContent = '';
    tiles = []; rows = [];
    for (var r = 0; r < ROWS; r++) {
      var row = document.createElement('div');
      row.className = 'row';
      row.setAttribute('role', 'row');
      var rt = [];
      for (var c = 0; c < COLS; c++) {
        var t = document.createElement('div');
        t.className = 'tile';
        t.setAttribute('role', 'gridcell');
        row.appendChild(t);
        rt.push(t);
      }
      board.appendChild(row);
      rows.push(row); tiles.push(rt);
    }
  }
  function tileLabel(r, c, letter, state) {
    return 'Row ' + (r + 1) + ', column ' + (c + 1) + ': ' + (letter ? letter.toUpperCase() + (state ? ', ' + STATE_WORD[state] : ', not submitted') : 'empty');
  }
  function paintTile(r, c, letter, state) {
    var t = tiles[r][c];
    t.textContent = letter ? letter.toUpperCase() : '';
    t.dataset.filled = letter ? 'true' : 'false';
    t.className = 'tile' + (state ? ' ' + state : '');
    t.setAttribute('aria-label', tileLabel(r, c, letter, state));
  }
  function paintCurrentRow() {
    var r = game.guesses.length;
    if (r >= ROWS) return;
    for (var c = 0; c < COLS; c++) paintTile(r, c, current[c] || '', null);
  }
  function resetKeys() {
    for (var k in keyEls) { keyEls[k].className = 'key' + (k === 'enter' || k === 'back' ? ' wide' : ''); }
    for (var k2 in keyEls) updateKeyLabel(k2, null);
  }
  function updateKeyLabel(k, state) {
    if (k.length !== 1) return;
    keyEls[k].setAttribute('aria-label', k.toUpperCase() + (state ? ', ' + STATE_WORD[state] : ''));
  }
  var RANK = { absent: 1, present: 2, correct: 3 };
  function colorKey(letter, state) {
    var el = keyEls[letter];
    if (!el) return;
    var cur = el.dataset.state;
    if (cur && RANK[cur] >= RANK[state]) return;
    el.dataset.state = state;
    el.classList.remove('absent', 'present', 'correct');
    el.classList.add(state);
    updateKeyLabel(letter, state);
  }
  function renderAll() {
    buildBoard();
    for (var k in keyEls) delete keyEls[k].dataset.state;
    resetKeys();
    game.guesses.forEach(function (g, r) {
      var s = score(g, game.answer);
      for (var c = 0; c < COLS; c++) { paintTile(r, c, g[c], s[c]); colorKey(g[c], s[c]); }
    });
    current = '';
    paintCurrentRow();
    updateChrome();
  }
  function updateChrome() {
    $('mode-daily').setAttribute('aria-pressed', game.mode === 'daily');
    $('mode-practice').setAttribute('aria-pressed', game.mode === 'practice');
    $('mode-label').textContent = game.mode === 'daily' ? 'Daily puzzle No. ' + puzzleNo(game.day) : 'Practice';
    $('hard-badge').hidden = !game.hard;
    var over = game.status !== 'playing';
    $('btn-new').hidden = !(game.mode === 'practice' && (over || game.guesses.length > 0));
    $('btn-new').textContent = over ? 'New word' : 'Skip word';
    syncSettingsUI();
  }

  /* ---------- Input ---------- */
  function press(key) {
    if (busy || game.status !== 'playing') return;
    if (key === 'enter') return submit();
    if (key === 'back') {
      if (current.length) { current = current.slice(0, -1); paintCurrentRow(); }
      return;
    }
    if (current.length < COLS) {
      current += key;
      paintCurrentRow();
      var t = tiles[game.guesses.length][current.length - 1];
      if (!reduceMotion) { t.classList.add('pop'); }
    }
  }
  function shakeRow(r) {
    if (reduceMotion) return;
    rows[r].classList.remove('shake');
    void rows[r].offsetWidth;
    rows[r].classList.add('shake');
    setTimeout(function () { rows[r].classList.remove('shake'); }, 520);
  }
  function submit() {
    var r = game.guesses.length;
    if (current.length < COLS) { shakeRow(r); toast('Not enough letters'); return; }
    if (!VALID[current]) { shakeRow(r); toast('Not in word list'); return; }
    if (game.hard) {
      var msg = hardViolation(current, game.guesses, game.answer);
      if (msg) { shakeRow(r); toast('Hard Mode: ' + msg, 2400); return; }
    }
    var guess = current, res = score(guess, game.answer);
    game.guesses.push(guess);
    current = '';
    var won = guess === game.answer;
    var lost = !won && game.guesses.length >= ROWS;
    game.status = won ? 'won' : (lost ? 'lost' : 'playing');
    persistGame();
    updateChrome();
    reveal(r, guess, res, function () {
      announce('Row ' + (r + 1) + ': ' + guess.toUpperCase() + '. ' + res.map(function (s, i) { return guess[i].toUpperCase() + ' ' + STATE_WORD[s]; }).join(', '));
      if (won) finish(true, r);
      else if (lost) finish(false, r);
    });
  }
  function reveal(r, guess, res, done) {
    busy = true;
    var finishUp = function () {
      for (var c = 0; c < COLS; c++) colorKey(guess[c], res[c]);
      busy = false;
      done();
    };
    if (reduceMotion) {
      for (var c = 0; c < COLS; c++) paintTile(r, c, guess[c], res[c]);
      return finishUp();
    }
    guess.split('').forEach(function (ch, c) {
      var t = tiles[r][c];
      setTimeout(function () {
        t.classList.add('flip');
        setTimeout(function () { t.classList.add(res[c]); t.setAttribute('aria-label', tileLabel(r, c, ch, res[c])); }, 250);
      }, c * FLIP_MS);
    });
    setTimeout(finishUp, (COLS - 1) * FLIP_MS + 520);
  }
  var WIN_MSGS = ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew'];
  function finish(won, r) {
    if (won) {
      toast(WIN_MSGS[r], 2200);
      if (!reduceMotion) tiles[r].forEach(function (t, i) { setTimeout(function () { t.classList.remove('flip'); t.classList.add('bounce'); }, i * 90); });
    } else {
      toast(game.answer.toUpperCase(), 4000);
    }
    if (game.mode === 'daily') {
      stats.played++;
      if (won) {
        stats.wins++;
        stats.streak = (stats.last === game.day - 1) ? stats.streak + 1 : 1;
        stats.max = Math.max(stats.max, stats.streak);
        stats.dist[r]++;
        lastResult = r;
      } else {
        stats.streak = 0;
        lastResult = null;
      }
      stats.last = game.day;
      persistStats();
      setTimeout(function () { openDialog('dlg-stats'); }, 1600);
    } else {
      updateChrome();
    }
  }

  /* ---------- Keyboard UI ---------- */
  function buildKeyboard() {
    var kb = $('keyboard');
    KEY_ROWS.forEach(function (str) {
      var row = document.createElement('div');
      row.className = 'krow';
      if (str.length === 9 && str[0] === 'a') { var s1 = document.createElement('span'); s1.className = 'spacer'; row.appendChild(s1); }
      str.split('').forEach(function (ch) {
        var b = document.createElement('button');
        b.type = 'button';
        var id = ch === '+' ? 'enter' : (ch === '-' ? 'back' : ch);
        b.className = 'key' + (id.length > 1 ? ' wide' : '');
        b.dataset.key = id;
        if (id === 'enter') { b.textContent = 'Enter'; b.setAttribute('aria-label', 'Enter'); }
        else if (id === 'back') { b.textContent = '⌫'; b.setAttribute('aria-label', 'Backspace'); }
        else { b.textContent = id; b.setAttribute('aria-label', id.toUpperCase()); }
        keyEls[id] = b;
        row.appendChild(b);
      });
      if (str.length === 9 && str[0] === 'a') { var s2 = document.createElement('span'); s2.className = 'spacer'; row.appendChild(s2); }
      kb.appendChild(row);
    });
    kb.addEventListener('click', function (e) {
      var b = e.target.closest('.key');
      if (b) press(b.dataset.key);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (openDlg) return;
    var tag = e.target && e.target.tagName;
    if ((e.key === 'Enter' || e.key === ' ') && (tag === 'BUTTON' || tag === 'SELECT')) return;
    if (e.key === 'Enter') { e.preventDefault(); press('enter'); }
    else if (e.key === 'Backspace') { e.preventDefault(); press('back'); }
    else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
  });

  /* ---------- Dialogs (focus trap, Esc) ---------- */
  var openDlg = null, lastFocus = null, countdownTimer = null;
  var FOCUSABLE = 'button:not([disabled]), [href], select, textarea, input, [tabindex]:not([tabindex="-1"])';
  function openDialog(id) {
    if (openDlg) closeDialog(true);
    var ov = $(id);
    lastFocus = document.activeElement;
    if (id === 'dlg-stats') renderStats();
    if (id === 'dlg-settings') syncSettingsUI();
    ov.hidden = false;
    $('app').setAttribute('inert', '');
    openDlg = ov;
    var first = ov.querySelector('.close-btn');
    if (first) first.focus();
  }
  function closeDialog(keepFocus) {
    if (!openDlg) return;
    openDlg.hidden = true;
    openDlg = null;
    $('app').removeAttribute('inert');
    clearInterval(countdownTimer);
    if (!keepFocus && lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
  }
  document.addEventListener('keydown', function (e) {
    if (!openDlg) return;
    if (e.key === 'Escape') { e.preventDefault(); closeDialog(); return; }
    if (e.key === 'Tab') {
      var items = Array.prototype.filter.call(openDlg.querySelectorAll(FOCUSABLE), function (el) { return !el.hidden && !el.closest('[hidden]') && el.offsetParent !== null; });
      if (!items.length) return;
      var f = items[0], l = items[items.length - 1];
      if (!openDlg.contains(document.activeElement)) { e.preventDefault(); f.focus(); }
      else if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
      else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll('.overlay'), function (ov) {
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) closeDialog(); });
    ov.querySelector('[data-close]').addEventListener('click', function () { closeDialog(); });
  });

  /* ---------- Stats ---------- */
  function renderStats() {
    var grid = $('stat-grid');
    grid.textContent = '';
    var pct = stats.played ? Math.round(stats.wins / stats.played * 100) : 0;
    [['Played', stats.played], ['Win %', pct], ['Current streak', stats.streak], ['Max streak', stats.max]].forEach(function (p) {
      var d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = p[0]; dd.textContent = p[1];
      d.appendChild(dt); d.appendChild(dd); grid.appendChild(d);
    });
    var dist = $('dist');
    dist.textContent = '';
    var max = Math.max.apply(null, stats.dist.concat([1]));
    stats.dist.forEach(function (n, i) {
      var row = document.createElement('div'); row.className = 'dist-row';
      var lab = document.createElement('span'); lab.textContent = i + 1;
      var bar = document.createElement('div');
      bar.className = 'dist-bar' + (lastResult === i && game.mode === 'daily' && game.status === 'won' ? ' hl' : '');
      bar.style.width = Math.max(7, Math.round(n / max * 100)) + '%';
      bar.textContent = n;
      bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', n + (n === 1 ? ' win' : ' wins') + ' in ' + (i + 1) + (i === 0 ? ' guess' : ' guesses'));
      row.appendChild(lab); row.appendChild(bar); dist.appendChild(row);
    });
    var over = game.mode === 'daily' && game.status !== 'playing';
    $('stats-foot').hidden = !over;
    $('share-fallback').hidden = true;
    $('stats-note').textContent = game.mode === 'daily' ? 'Daily games only. Practice games are not counted.' : 'Daily games only. Practice games are not counted.';
    clearInterval(countdownTimer);
    if (over) {
      tickCountdown();
      countdownTimer = setInterval(tickCountdown, 1000);
    }
  }
  function tickCountdown() {
    var now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var s = Math.max(0, Math.floor((next - now) / 1000));
    function p(n) { return (n < 10 ? '0' : '') + n; }
    $('countdown').textContent = p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60);
    if (s === 0) checkNewDay();
  }

  /* ---------- Share ---------- */
  function shareText() {
    var sym = settings.contrast ? { correct: '🟧', present: '🟦', absent: '⬛' } : { correct: '🟩', present: '🟨', absent: '⬛' };
    var head = 'Wordle Clone ' + (game.mode === 'daily' ? 'No. ' + puzzleNo(game.day) : 'Practice') + ' ' + (game.status === 'won' ? game.guesses.length : 'X') + '/6' + (game.hard ? '*' : '');
    var lines = game.guesses.map(function (g) { return score(g, game.answer).map(function (s) { return sym[s]; }).join(''); });
    return head + '\n\n' + lines.join('\n');
  }
  function fallbackCopy(text) {
    var ta = $('share-text');
    $('share-fallback').hidden = false;
    ta.value = text;
    ta.focus(); ta.select();
    var ok = false;
    try { ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
    if (ok) { $('share-fallback').hidden = true; toast('Copied to clipboard'); }
    else toast('Copy blocked. Select the text below.', 2800);
  }
  $('btn-share').addEventListener('click', function () {
    var text = shareText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Copied to clipboard'); }, function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  });

  /* ---------- Settings ---------- */
  function applyTheme() {
    var root = document.documentElement;
    if (settings.theme === 'light' || settings.theme === 'dark') root.setAttribute('data-theme', settings.theme);
    else root.removeAttribute('data-theme');
    if (settings.contrast) root.setAttribute('data-contrast', 'on'); else root.removeAttribute('data-contrast');
  }
  function hardLocked() { return game && game.guesses.length > 0; }
  function syncSettingsUI() {
    var h = $('set-hard');
    var on = game ? game.hard : settings.hard;
    h.setAttribute('aria-checked', on ? 'true' : 'false');
    h.setAttribute('aria-disabled', hardLocked() ? 'true' : 'false');
    $('set-contrast').setAttribute('aria-checked', settings.contrast ? 'true' : 'false');
    $('set-theme').value = settings.theme;
    $('storage-warn').hidden = storageOk;
  }
  $('set-hard').addEventListener('click', function () {
    if (hardLocked()) {
      toast(game.status === 'playing' ? 'Hard Mode can only be changed before your first guess' : 'Hard Mode can be changed when a new game starts', 2600);
      return;
    }
    game.hard = !game.hard;
    settings.hard = game.hard;
    persistSettings(); persistGame();
    updateChrome();
    announce('Hard Mode ' + (game.hard ? 'on' : 'off'));
  });
  $('set-contrast').addEventListener('click', function () {
    settings.contrast = !settings.contrast; persistSettings(); applyTheme(); syncSettingsUI();
  });
  $('set-theme').addEventListener('change', function (e) {
    settings.theme = e.target.value; persistSettings(); applyTheme();
  });

  /* ---------- Mode switching & day rollover ---------- */
  function setMode(mode) {
    if (busy) return;
    if (game && game.mode === mode) return;
    game = newGame(mode);
    lastResult = null;
    renderAll();
    announce(mode === 'daily' ? 'Daily puzzle' : 'Practice mode');
  }
  function checkNewDay() {
    if (game && game.mode === 'daily' && game.day !== dayNumber() && !busy) {
      game = newGame('daily'); renderAll(); toast('A new daily word is ready');
      if (openDlg) closeDialog(true);
    }
  }
  $('mode-daily').addEventListener('click', function () { setMode('daily'); });
  $('mode-practice').addEventListener('click', function () { setMode('practice'); });
  $('btn-new').addEventListener('click', function () {
    if (busy) return;
    game = newGame('practice'); renderAll(); announce('New practice word');
  });
  $('btn-help').addEventListener('click', function () { openDialog('dlg-help'); });
  $('btn-stats').addEventListener('click', function () { openDialog('dlg-stats'); });
  $('btn-settings').addEventListener('click', function () { openDialog('dlg-settings'); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) checkNewDay(); });
  window.addEventListener('focus', checkNewDay);

  /* ---------- Init ---------- */
  applyTheme();
  buildKeyboard();
  game = newGame('daily');
  renderAll();
  if (!storageOk) toast('Storage is blocked: progress will not be saved', 3200);
  else if (!sGet('wordle.seen')) { sSet('wordle.seen', '1'); openDialog('dlg-help'); }
  if (game.status !== 'playing') announce(game.status === 'won' ? 'You already solved today\'s word.' : 'Today\'s word was ' + game.answer.toUpperCase());
})();
