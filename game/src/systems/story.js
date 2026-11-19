// Street-level locations sit on the fixed road grid, not inside generated buildings.
const point = (x, z) => ({ x, z });
const line = (speaker, text) => ({ speaker, text });

export const MISSIONS = [
  {
    id: 'salt-envelope', name: 'Salt in the Envelope',
    brief: 'A bike courier gets one unusual delivery. Meet Duke on the Palma boardwalk.',
    unlock: { after: null, reputation: 0 }, rewards: { cash: 350, reputation: 10 },
    dialogue: [line('Duke', 'Mars Vega? Your dispatch says you never lose a parcel. I need someone who knows which streets still belong to people.'), line('Mars', 'Marisol on the invoice. Mars on the radio. Where am I going?'), line('Duke', 'The blue locker on Palma. Bring its envelope to my street office. Same city, better rate.')],
    objectives: [
      { id: 'meet', verb: 'go', target: point(-13, 43), radius: 4, text: 'Go to Duke’s boardwalk contact' },
      { id: 'parcel', verb: 'collect', target: point(-13, 15), radius: 3, text: 'Collect the salt-stained envelope', call: [line('Duke', 'That envelope is a dock access schedule. The Chrome Serpents charge a toll on every crate. We are cancelling theirs.')] },
      { id: 'office', verb: 'go', target: point(-12, 78), radius: 4, text: 'Deliver the envelope to Duke’s street office' },
    ],
    ending: [line('Mars', 'I deliver things, Duke. I do not usually join heist crews.'), line('Duke', 'Then consider this a very well-paid wrong turn.')],
  },
  {
    id: 'borrowed-sunshine', name: 'Borrowed Sunshine',
    brief: 'Steal a particular gold Sirocco RS for the crew. Bring it back intact.',
    unlock: { after: 'salt-envelope', reputation: 10 }, rewards: { cash: 650, reputation: 15 },
    dialogue: [line('Duke', 'Our driver Inez needs the gold Sirocco by the Palma lights. Not another car. That one has a copied port transponder.'), line('Mars', 'A stolen key inside a stolen car. Your paperwork must be beautiful.')],
    objectives: [
      { id: 'car', verb: 'steal', target: point(-5, -29), vehicle: 5, radius: 4, text: 'Steal the gold Sirocco RS · E at its door' },
      { id: 'garage', verb: 'deliver', target: point(-5, 87), radius: 7, time: 80, text: 'Deliver the gold Sirocco to Inez before the gate shuts', call: [line('Inez', 'Keep the transponder out of the sea and the bonnet out of a wall. I can fix everything else.')] },
    ],
    ending: [line('Inez', 'Still gold. Still in one piece. You have a seat in this crew.')],
  },
  {
    id: 'quiet-frequency', name: 'Quiet Frequency',
    brief: 'Collect a radio key in Neon Row without bringing a patrol to the meeting.',
    unlock: { after: 'borrowed-sunshine', reputation: 25 }, rewards: { cash: 800, reputation: 20 },
    dialogue: [line('Duke', 'Inez found a Serpent radio key. Our contact left it by the Neon tram stop. Keep this quiet: no more than one star.'), line('Mars', 'For once your plan and my survival instinct agree.')],
    objectives: [
      { id: 'radio', verb: 'collect', target: point(58, -116), radius: 4, maxWanted: 1, text: 'Collect the radio key · keep heat at one star or less' },
      { id: 'hide', verb: 'lose', target: point(58, -58), radius: 9, heat: 32, text: 'Lose the Civic Guard, then reach the Neon dead drop', call: [line('Duke', 'The locker had a silent alarm. Break their line of sight. The dead drop stays closed until your heat is gone.')] },
    ],
    ending: [line('Mars', 'The Serpents are moving more than crates. This channel lists eviction crews.'), line('Duke', 'Then we take their payroll, and their proof.')],
  },
  {
    id: 'cold-manifest', name: 'Cold Manifest',
    brief: 'Lift the port manifest from Dockside and return it before the shift change.',
    unlock: { after: 'quiet-frequency', reputation: 45 }, rewards: { cash: 1100, reputation: 25 },
    dialogue: [line('Inez', 'The port manifest says where the payroll van stops. A paper copy is taped under the Dockside weighbridge.'), line('Mars', 'Paper. Finally, a security system that fits in my courier bag.')],
    objectives: [
      { id: 'manifest', verb: 'collect', target: point(116, -348), radius: 4, text: 'Collect the hidden Dockside manifest' },
      { id: 'relay', verb: 'go', target: point(116, -232), radius: 6, time: 75, text: 'Deliver the manifest before the shift changes', call: [line('Duke', 'The route is real. So is the name signing those eviction orders: Rafe Voss, Serpent treasurer.')] },
    ],
    ending: [line('Mars', 'We take Voss’s money, return the deposits, and copy every signature.'), line('Inez', 'Now that sounds like a crew worth driving for.')],
  },
  {
    id: 'cut-the-rattle', name: 'Cut the Rattle',
    brief: 'Stop Voss’s armed enforcer and recover the vault key.',
    unlock: { after: 'cold-manifest', reputation: 70 }, rewards: { cash: 1400, reputation: 30 },
    dialogue: [line('Duke', 'Voss sent his enforcer, Coil, to burn our contact list. He is armed and waiting at the freight crossing.'), line('Mars', 'Then he does not get past that crossing.')],
    objectives: [
      { id: 'crossing', verb: 'go', target: point(174, -290), radius: 12, text: 'Go to the freight crossing' },
      { id: 'coil', verb: 'eliminate', target: point(174, -310), enemies: 1, text: 'Take out Coil · aim with right mouse, fire with left', call: [line('Inez', 'Red jacket, silver mask. He has the key. Keep cover between you and his gun.')] },
      { id: 'key', verb: 'collect', target: point(174, -310), radius: 3, text: 'Collect Coil’s vault key' },
    ],
    ending: [line('Mars', 'Key secured. I want the families paid before anyone takes a cut.'), line('Duke', 'You have my word. Hold me to it.')],
  },
  {
    id: 'payroll-tide', name: 'Payroll at High Tide',
    brief: 'The heist: take the marked payroll van and deliver it to Coral Heights.',
    unlock: { after: 'cut-the-rattle', reputation: 100 }, rewards: { cash: 2200, reputation: 40 },
    dialogue: [line('Inez', 'The white Parcel 200 is outside the vault. I have the cameras. You have the key.'), line('Mars', 'From bike envelopes to payroll vans. Dispatch will never believe my mileage.')],
    objectives: [
      { id: 'van', verb: 'steal', target: point(113, -377), vehicle: 3, text: 'Steal the white Parcel 200 payroll van' },
      { id: 'drop', verb: 'deliver', target: point(290, -58), radius: 8, time: 150, heat: 28, text: 'Deliver the payroll van intact to Coral Heights', call: [line('Duke', 'Voss knows. The Guard is on the radio. Take the wide streets and keep that van rolling.')] },
    ],
    ending: [line('Inez', 'The money is here. So is a tracker under the rear axle.'), line('Mars', 'Kill it. We are about to have company.')],
  },
  {
    id: 'glass-rain', name: 'Glass Rain',
    brief: 'The Chrome Serpents found the exchange. Survive their ambush and leave Neon Row.',
    unlock: { after: 'payroll-tide', reputation: 140 }, rewards: { cash: 1800, reputation: 40 },
    dialogue: [line('Duke', 'The decoy exchange is under the Neon lights. I moved the families’ money, but the Serpents followed my car.'), line('Mars', 'Then we buy Inez time. You are going to help me finish this, Duke.')],
    objectives: [
      { id: 'exchange', verb: 'go', target: point(232, -116), radius: 8, text: 'Reach the decoy exchange in Neon Row' },
      { id: 'ambush', verb: 'survive', target: point(232, -116), area: { x: 232, z: -116, radius: 42 }, duration: 30, enemies: 4, text: 'Survive the Chrome Serpent ambush · stay in the marked area', call: [line('Inez', 'Thirty seconds. I am uploading their ledger. Stay near the relay or we lose the link.')] },
      { id: 'escape', verb: 'escape', target: point(348, -58), district: 'neon', radius: 10, time: 80, text: 'Escape Neon Row through the eastern checkpoint' },
    ],
    ending: [line('Duke', 'I used to fix deals for Voss. That ledger has my name in it too.'), line('Mars', 'Then you do not get to edit it. We send the whole thing.')],
  },
  {
    id: 'open-circuit', name: 'Open Circuit',
    brief: 'Carry the uncut ledger to the Causeway transmitter and break the Serpents’ hold.',
    unlock: { after: 'glass-rain', reputation: 180 }, rewards: { cash: 4000, reputation: 70 },
    dialogue: [line('Inez', 'Every deposit is back with its owner. One delivery left: the original ledger, at the Causeway transmitter.'), line('Mars', 'No buyer. No fixer’s fee. Sunburn gets the receipts.')],
    objectives: [
      { id: 'ledger', verb: 'collect', target: point(290, 0), radius: 4, maxWanted: 1, text: 'Collect the original ledger · arrive without a pursuit' },
      { id: 'broadcast', verb: 'go', target: point(406, 58), radius: 5, time: 100, text: 'Deliver the ledger to the Causeway transmitter', call: [line('Duke', 'I am staying on the line. If they ask who signed those deals, tell them I did.')] },
      { id: 'clear', verb: 'lose', target: point(348, 116), radius: 9, heat: 40, text: 'Lose the police and reach the crew’s Causeway safehouse' },
    ],
    ending: [line('Inez', 'The ledger is everywhere. Voss cannot buy every radio in this city.'), line('Mars', 'Keep the engine warm. Tomorrow we open a courier co-op. This time, we choose the deliveries.')],
  },
];
