// The same contract describes a job, its unlock condition and its live objectives.
const route = (id, verb, x, z, text, extra = {}) => ({ id, verb, text, target: { x, z }, radius: 4, ...extra });
const radio = (speaker, text) => ({ speaker, text });
const records = [
  ['salt-envelope', 'Salt in the Envelope', 350, 10, 'Duke',
    'Mars, the dock schedule is in a salt-stained envelope. Pick it up on Palma. The Chrome Serpents have charged this city for its own streets long enough.',
    [route('meet', 'go', -13, 43, 'Meet Duke’s boardwalk contact'), route('parcel', 'collect', -13, 15, 'Collect the salt-stained envelope', { call: [radio('Duke', 'The envelope opens a door at the port. Deliver it to my street office. Stay where people can see you.')] }), route('office', 'go', -12, 78, 'Deliver the envelope to Duke’s office')]],
  ['borrowed-sunshine', 'Borrowed Sunshine', 650, 15, 'Inez',
    'A gold Sirocco RS is waiting at the Palma lights. Its port transponder is the key. Borrow the sunshine and bring it back with four wheels.',
    [route('car', 'steal', -5, -29, 'Steal the gold Sirocco RS', { vehicle: 5 }), route('garage', 'deliver', -5, 87, 'Deliver the Sirocco to Inez Auto', { time: 80, radius: 7 })]],
  ['quiet-frequency', 'Quiet Frequency', 800, 20, 'Duke',
    'Neon Row has a radio key we need. This is a quiet run, Mars. More than one star and our contact disappears.',
    [route('radio', 'collect', 58, -116, 'Retrieve the Neon radio key · one star maximum', { maxWanted: 1 }), route('hide', 'lose', 58, -58, 'Lose the Guard and reach the dead drop', { heat: 32, radius: 9 })]],
  ['cold-manifest', 'Cold Manifest', 1100, 25, 'Inez',
    'There is a manifest under the Dockside weighbridge. The payroll route and every eviction order are on it. Get there before the shift changes.',
    [route('manifest', 'collect', 116, -348, 'Recover the Dockside manifest'), route('relay', 'go', 116, -232, 'Bring the manifest to the relay', { time: 75, radius: 6 })]],
  ['cut-the-rattle', 'Cut the Rattle', 1400, 30, 'Duke',
    'Voss sent Coil to burn our contact list at the freight crossing. He is armed. Stop him, take the vault key, and keep our people out of this.',
    [route('crossing', 'go', 174, -290, 'Reach the freight crossing', { radius: 12 }), route('coil', 'eliminate', 174, -310, 'Stop Coil · aim and fire', { enemies: 1 }), route('key', 'collect', 174, -310, 'Recover Coil’s vault key')]],
  ['payroll-tide', 'Payroll at High Tide', 2200, 40, 'Inez',
    'White Parcel 200 outside the vault. I have the cameras. You have the key. The payroll belongs to the families Voss pushed out.',
    [route('van', 'steal', 113, -377, 'Take the white payroll van', { vehicle: 3 }), route('drop', 'deliver', 290, -58, 'Deliver the payroll to Coral Heights', { time: 150, heat: 28, radius: 8 })]],
  ['glass-rain', 'Glass Rain', 1800, 40, 'Duke',
    'The Serpents followed me to the Neon exchange. Inez needs thirty seconds at the relay. Hold them here, then get clear of the district.',
    [route('exchange', 'go', 232, -116, 'Reach the decoy exchange', { radius: 8 }), route('ambush', 'survive', 232, -116, 'Hold the relay for thirty seconds', { duration: 30, enemies: 4, area: { x: 232, z: -116, radius: 42 } }), route('escape', 'escape', 348, -58, 'Escape through the eastern checkpoint', { time: 80, radius: 10, district: 'neon' })]],
  ['open-circuit', 'Open Circuit', 4000, 70, 'Inez',
    'The deposits are home. One last delivery: the original ledger to the Causeway transmitter. Duke’s name stays in it. Nobody gets to edit the truth.',
    [route('ledger', 'collect', 290, 0, 'Collect the uncut ledger · arrive quietly', { maxWanted: 1 }), route('broadcast', 'go', 406, 58, 'Broadcast the ledger at the transmitter', { time: 100, radius: 5 }), route('clear', 'lose', 348, 116, 'Lose the police and reach the safehouse', { heat: 40, radius: 9 })]],
];
let reputationRequired = 0;
export const MISSIONS = records.map((entry, index) => {
  const [id, name, cash, reputation, speaker, speech, objectives] = entry;
  const mission = {
    id, name, brief: speech, unlock: { after: index ? records[index - 1][0] : null, reputation: reputationRequired },
    rewards: { cash, reputation }, objectives,
    dialogue: [radio(speaker, speech), radio('Mars', index === 7 ? 'No more tolls. No more disappearing names. Let Sunburn hear every word.' : 'I know the streets. Keep the radio open; I will make the delivery.')],
    ending: [radio('Mars', index === 7 ? 'Ledger delivered. Tomorrow we start a courier co-op. Our city, our routes.' : 'Delivery confirmed. Tell the crew to keep the engine warm.'), radio(speaker, index === 7 ? 'Every radio has the proof. Voss cannot buy the tide.' : 'Payment is through. There is more work when you are ready.')],
  };
  reputationRequired += reputation; return mission;
});
