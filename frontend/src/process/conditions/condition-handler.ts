import { Condition } from '@typing/content';
import { StoreID, VariableListStr, VariableNum, VariableProf } from '@typing/variables';
import {
  addVariableBonus,
  adjVariable,
  getAllSaveVariables,
  getAllSkillVariables,
  getAllSpeedVariables,
  getVariable,
} from '../variables/variable-manager';
import { convertToHardcodedLink } from '@content/hardcoded-links';
import { isPlayingPathfinder, isPlayingStarfinder } from '@content/system-handler';
import { cloneDeep, isEqual, uniqWith } from 'lodash-es';

const CONDITIONS: Condition[] = [
  {
    name: 'Blinded',
    description: `You can’t see. All normal terrain is difficult terrain to you. You can’t detect anything using vision. You automatically critically fail Perception checks that require you to be able to see, and if vision is your only precise sense, you take a –4 status penalty to Perception checks. You are immune to visual effects. Blinded overrides dazzled.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Broken',
    description: `Broken is a condition that affects only objects. An object is broken when damage has reduced its Hit Points to equal or less than its Broken Threshold. A broken object can’t be used for its normal function, nor does it grant bonuses— with the exception of armor. Broken armor still grants its item bonus to AC, but it also imparts a status penalty to AC depending on its category: –1 for broken light armor, –2 for broken medium armor, or –3 for broken heavy armor.
    A broken item still imposes penalties and limitations normally incurred by carrying, holding, or wearing it. For example, broken armor would still impose its Dexterity modifier cap, check penalty, and so forth. If an effect makes an item broken automatically and the item has more HP than its Broken Threshold, that effect also reduces the item’s current HP to the Broken Threshold.`,
    for_creature: false,
    for_object: true,
  },
  {
    name: 'Clumsy',
    description: `Your movements become clumsy and inexact. Clumsy always includes a value. You take a status penalty equal to the condition value to Dexterity-based checks and DCs, including AC, Reflex saves, ranged attack rolls, and skill checks using Acrobatics, Stealth, and Thievery.`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Concealed',
    description: `You are difficult for one or more creatures to see due to thick fog or some other obscuring feature. You can be concealed to some creatures but not others. While concealed, you can still be observed, but you’re tougher to target. A creature that you’re concealed from must succeed at a DC 5 flat check when targeting you with an attack, spell, or other effect. If the check fails, you aren’t affected. Area effects aren’t subject to this flat check.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Confused',
    description: `You don’t have your wits about you, and you attack wildly. You are off-guard, you don’t treat anyone as your ally (though they might still treat you as theirs), and you can’t Delay, Ready, or use reactions.
    You use all your actions to Strike or cast offensive cantrips, though the GM can have you use other actions to facilitate attack, such as draw a weapon, move so the target is in reach, and so forth. Your targets are determined randomly by the GM. If you have no other viable targets, you target yourself, automatically hitting but not scoring a critical hit. If it’s impossible for you to attack or cast spells, you babble incoherently, wasting your actions.
    Each time you take damage from an attack or spell, you can attempt a DC 11 flat check to recover from your confusion and end the condition.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Controlled',
    description: `You have been commanded, magically dominated, or otherwise had your will subverted. The controller dictates how you act and can make you use any of your actions, including attacks, reactions, or even Delay. The controller usually doesn’t have to spend their own actions when controlling you.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Dazzled',
    description: `Your eyes are overstimulated or your vision is swimming. If vision is your only precise sense, all creatures and objects are concealed from you.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Deafened',
    description: `You can’t hear. You automatically critically fail Perception checks that require you to be able to hear. You take a –2 status penalty to Perception checks for initiative and checks that involve sound but also rely on other senses. If you perform an action that has the auditory trait, you must succeed at a DC 5 flat check or the action is lost; attempt the check after spending the action but before any effects are applied. You are immune to auditory effects while deafened.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Doomed',
    description: `Your soul has been gripped by a powerful force that calls you closer to death. Doomed always includes a value. The dying value at which you die is reduced by your doomed value. If your maximum dying value is reduced to 0, you instantly die. When you die, you’re no longer doomed.
    Your doomed value decreases by 1 each time you get a full night’s rest.`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Drained',
    description: `Your health and vitality have been depleted as you’ve lost blood, life force, or some other essence. Drained always includes a value. You take a status penalty equal to your drained value on Constitution-based checks, such as Fortitude saves. You also lose a number of Hit Points equal to your level (minimum 1) times the drained value, and your maximum Hit Points are reduced by the same amount. For example, if you become drained 3 and you’re a 3rd-level character, you lose 9 Hit Points and reduce your maximum Hit Points by 9. Losing these Hit Points doesn’t count as taking damage.
    Each time you get a full night’s rest, your drained value decreases by 1. This increases your maximum Hit Points, but you don’t immediately recover the lost Hit Points.`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Dying',
    description: `You are bleeding out or otherwise at death’s door. While you have this condition, you are unconscious. Dying always includes a value, and if it ever reaches dying 4, you die. When you’re dying, you must attempt a recovery check (page 411) at the start of your turn each round to determine whether you get better or worse. Your dying condition increases by 1 if you take damage while dying, or by 2 if you take damage from an enemy’s critical hit or a critical failure on your save.
    If you lose the dying condition by succeeding at a recovery check and are still at 0 Hit Points, you remain unconscious, but you can wake up as described in that condition. You lose the dying condition automatically and wake up if you ever have 1 Hit Point or more. Any time you lose the dying condition, you gain the wounded 1 condition, or increase your wounded condition value by 1 if you already have that condition.`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Encumbered',
    description: `You are carrying more weight than you can manage. While you’re encumbered, you’re clumsy 1 and take a 10-foot penalty to all your Speeds. As with all penalties to your Speed, this can’t reduce your Speed below 5 feet.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Enfeebled',
    description: `You’re physically weakened. Enfeebled always includes a value. When you are enfeebled, you take a status penalty equal to the condition value to Strength-based rolls and DCs, including Strength-based melee attack rolls, Strength-based damage rolls, and Athletics checks.`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Fascinated',
    description: `You’re compelled to focus your attention on something, distracting you from whatever else is going on around you. You take a –2 status penalty to Perception and skill checks, and you can’t use concentrate actions unless they (or their intended consequences) are related to the subject of your fascination, as determined by the GM. For instance, you might be able to ${convertToHardcodedLink('action', 'Seek')} and ${convertToHardcodedLink('action', 'Recall Knowledge')} about the subject, but you likely couldn’t cast a spell targeting a different creature. This condition ends if a creature uses hostile actions against you or any of your allies.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Fatigued',
    description: `You’re tired and can’t summon much energy. You take a –1 status penalty to AC and saving throws. You can’t use exploration activities performed while traveling, such as those on pages 438–439.
    You recover from fatigue after a full night’s rest.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Fleeing',
    description: `You’re forced to run away due to fear or some other compulsion. On your turn, you must spend each of your actions trying to escape the source of the fleeing condition as expediently as possible (such as by using move actions to flee, or opening doors barring your escape). The source is usually the effect or creature that gave you the condition, though some effects might define something else as the source. You can’t Delay or Ready while fleeing.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Friendly',
    description: `This condition reflects a creature’s disposition toward a particular character, and only supernatural effects (like a spell) can impose this condition on a PC. A creature that is friendly to a character likes that character. It is likely to agree to Requests from that character as long as they are simple, safe, and don’t cost too much to fulfill. If the character (or one of their allies) uses hostile actions against the creature, the creature gains a worse attitude condition depending on the severity of the hostile action, as determined by the GM.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Frightened',
    description: `You’re gripped by fear and struggle to control your nerves. The frightened condition always includes a value. You take a status penalty equal to this value to all your checks and DCs. Unless specified otherwise, at the end of each of your turns, the value of your frightened condition decreases by 1.`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Grabbed',
    description: `You’re held in place by another creature, giving you the off-guard and immobilized conditions. If you attempt a manipulate action while grabbed, you must succeed at a DC 5 flat check or it is lost; roll the check after spending the action, but before any effects are applied.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Helpful',
    description: `This condition reflects a creature’s disposition toward a particular character, and only supernatural effects (like a spell) can impose this condition on a PC. A creature that is helpful to a character wishes to actively aid that character. It will accept reasonable Requests from that character, as long as such requests aren’t at the expense of the helpful creature’s goals or quality of life. If the character (or one of their allies) uses a hostile action against the creature, the creature gains a worse attitude condition depending on the severity of the hostile action, as determined by the GM.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Hidden',
    description: `While you’re hidden from a creature, that creature knows the space you’re in but can’t tell precisely where you are. You typically become hidden by using Stealth to ${convertToHardcodedLink('action', 'Hide')}. When ${convertToHardcodedLink('action', 'Seek', 'Seeking')} a creature using only imprecise senses, it remains hidden, rather than observed. A creature you’re hidden from is off-guard to you, and it must succeed at a DC 11 flat check when targeting you with an attack, spell, or other effect or it fails to affect you. Area effects aren’t subject to this flat check.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Hostile',
    description: `This condition reflects a creature’s disposition toward a particular character, and only supernatural effects (like a spell) can impose on a PC. A creature hostile to a character actively seeks to harm that character. It doesn’t necessarily attack, but it won’t accept Requests from the character.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Immobilized',
    description: `You are incapable of movement. You can’t use any actions that have the move trait. If you’re immobilized by something holding you in place and an external force would move you out of your space, the force must succeed at a check against either the DC of the effect holding you in place or the relevant defense (usually Fortitude DC) of the monster holding you in place.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Indifferent',
    description: `This condition reflects a creature’s disposition toward a particular character, and only supernatural effects (like a spell) can impose this condition on a PC. A creature that is indifferent to a character doesn’t really care one way or the other about that character. Assume a creature’s attitude to a given character is indifferent unless specified otherwise.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Invisible',
    description: `You can’t be seen. You’re undetected to everyone. Creatures can ${convertToHardcodedLink('action', 'Seek')} to detect you; if a creature succeeds at its Perception check against your Stealth DC, you become hidden to that creature until you ${convertToHardcodedLink('action', 'Sneak')} to become undetected again. If you become invisible while someone can already see you, you start out hidden to them (instead of undetected) until you successfully ${convertToHardcodedLink('action', 'Sneak')}. You can’t become observed while invisible except via special abilities or magic.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Observed',
    description: `Anything in plain view is observed by you. If a creature takes measures to avoid detection, such as by using Stealth to ${convertToHardcodedLink('action', 'Hide')},
    it can become hidden or undetected instead of observed. If you have another precise sense besides sight, you might be able to observe a creature or object using that sense instead. You can observe a creature with only your precise senses. When ${convertToHardcodedLink('action', 'Seek', 'Seeking')} a creature using only imprecise senses, it remains hidden, rather than observed.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Off-guard',
    description: `You’re distracted or otherwise unable to focus your full attention on defense. You take a –2 circumstance penalty to AC. Some effects give you the off-guard condition only to certain creatures or against certain attacks. Others— especially conditions—can make you off-guard against everything. If a rule doesn’t specify that the condition applies only to certain circumstances, it applies to all of them, such as “The target is off-guard.”`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Paralyzed',
    description: `You’re frozen in place. You have the off-guard condition and can’t act except to ${convertToHardcodedLink('action', 'Recall Knowledge')} and use actions that require only your mind (as determined by the GM). Your senses still function, but only in the areas you can perceive without moving, so you can’t ${convertToHardcodedLink('action', 'Seek')}.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Persistent Damage',
    description: `You are taking damage from an ongoing effect, such as from being lit on fire. Instead of taking persistent damage immediately, you take it at the end of each of your turns as long as you have the condition, rolling any damage dice anew each time. After you take persistent damage, roll a DC 15 flat check to see if you recover from the persistent damage. If you succeed, the condition ends.
    You can take steps to help yourself recover from persistent damage, see ${convertToHardcodedLink('action', 'Assisted Recovery')}.`,
    for_creature: true,
    for_object: true,
  },
  {
    name: 'Petrified',
    description: `You have been turned to stone. You can’t act, nor can you sense anything. You become an object with a Bulk double your normal Bulk (typically 12 for a petrified Medium creature or 6 for a petrified Small creature), AC 9, Hardness 8, and the same current Hit Points you had when alive. You don’t have a Broken Threshold. When the petrified condition ends, you have the same number of Hit Points you had as a statue. If the statue is destroyed, you immediately die. While petrified, your mind and body are in stasis, so you don’t age or notice the passing of time.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Prone',
    description: `You’re lying on the ground. You are off-guard and take a –2 circumstance penalty to attack rolls. The only move actions you can use while you’re prone are ${convertToHardcodedLink('action', 'Crawl')} and ${convertToHardcodedLink('action', 'Stand')}. Standing up ends the prone condition. You can ${convertToHardcodedLink('action', 'Take Cover')} while prone to hunker down and gain greater cover against ranged attacks, even if you don’t have an object to get behind, which grants you a +4 circumstance bonus to AC against ranged attacks (but you remain off-guard).
    If you would be knocked prone while you’re Climbing or Flying, you fall (see page 421 for the rules on falling). You can’t be knocked prone when ${convertToHardcodedLink('action', 'Swim', 'Swimming')}.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Quickened',
    description: `You’re able to act more quickly. You gain 1 additional action at the start of your turn each round. Many effects that make you quickened require you use this extra action only in certain ways. If you become quickened from multiple sources, you can use the extra action you’ve been granted for any single action allowed by any of the effects that made you quickened. Because quickened has its effect at the start of your turn, you don’t immediately gain actions if you become quickened during your turn.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Restrained',
    description: `You’re tied up and can barely move, or a creature has you pinned. You have the off-guard and immobilized conditions, and you can’t use any attack or manipulate actions except to attempt to Escape or Force Open your bonds. Restrained overrides grabbed.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Sickened',
    description: `You feel ill. Sickened always includes a value. You take a status penalty equal to this value on all your checks and DCs. You can’t willingly ingest anything—including elixirs and potions—while sickened.
    You can spend a single action retching in an attempt to recover, which lets you immediately attempt a Fortitude save against the DC of the effect that made you sickened. On a success, you reduce your sickened value by 1 (or by 2 on a critical success).`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Slowed',
    description: `You have fewer actions. Slowed always includes a value. When you regain your actions, reduce the number of actions regained by your slowed value. Because you regain actions at the start of your turn, you don’t immediately lose actions if you become slowed during your turn.`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Stunned',
    description: `You’ve become senseless. You can’t act. Stunned usually includes a value, which indicates how many total actions you lose, possibly over multiple turns, from being stunned. Each time you regain actions, reduce the number you regain by your stunned value, then reduce your stunned value by the number of actions you lost. For example, if you were stunned 4, you would lose all 3 of your actions on your turn, reducing you to stunned 1; on your next turn, you would lose 1 more action, and then be able to use your remaining 2 actions normally. Stunned might also have a duration instead, such as “stunned for 1 minute,” causing you to lose all your actions for the duration.
    Stunned overrides slowed. If the duration of your stunned condition ends while you are slowed, you count the actions lost to the stunned condition toward those lost to being slowed. So, if you were stunned 1 and slowed 2 at the beginning of your turn, you would lose 1 action from stunned, and then lose only 1 additional action by being slowed, so you would still have 1 action remaining to use that turn.`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Stupefied',
    description: `Your thoughts and instincts are clouded. Stupefied always includes a value. You take a status penalty equal to this value on Intelligence-, Wisdom-, and Charisma-based checks and DCs, including Will saving throws, spell attack modifiers, spell DCs, and skill checks that use these attribute modifiers. Any time you attempt to ${convertToHardcodedLink('action', 'Cast a Spell')} while stupefied, the spell is disrupted unless you succeed at a flat check with a DC equal to 5 + your stupefied value.`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Unconscious',
    description: `You’re sleeping or have been knocked out. You can’t act. You take a –4 status penalty to AC, Perception, and Reflex saves, and you have the blinded and off-guard conditions. When you gain this condition, you fall prone and drop items you’re holding unless the effect states otherwise or the GM determines you’re positioned so you wouldn’t.
    If you’re unconscious because you’re dying, you can’t wake up while you have 0 Hit Points. If you are restored to 1 Hit Point or more, you lose the dying and unconscious conditions and can act normally on your next turn.
    If you are unconscious and at 0 Hit Points, but not dying, you return to 1 Hit Point and awaken after sufficient time passes. The GM determines how long you remain unconscious, from a minimum of 10 minutes to several hours. If you are healed, you lose the unconscious condition and can act normally on your next turn.
    If you’re unconscious and have more than 1 Hit Point (typically because you are asleep or unconscious due to an effect), you wake up in one of the following ways.
    • You take damage, though if the damage reduces you to 0 Hit Points, you remain unconscious and gain the dying condition as normal.
    • You receive healing, other than the natural healing you get from resting.
    • Someone shakes you awake with an Interact action.
    • Loud noise around you might wake you. At the start of your turn, you automatically attempt a Perception check against the noise’s DC (or the lowest DC if there is more than one noise), waking up if you succeed. If creatures are attempting to stay quiet around you, this Perception check uses their Stealth DCs. Some effects make you sleep so deeply that they
    don’t allow you this Perception check.
    • If you are simply asleep, the GM decides you wake
    up either because you have had a restful night’s sleep or something disrupted that rest.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Undetected',
    description: `When you are undetected by a creature, that creature can’t see you at all, has no idea what space you occupy, and can’t target you, though you still can be affected by abilities that target an area. When you’re undetected by a creature, that creature is off-guard to you.
    A creature you’re undetected by can guess which square you’re in to try targeting you. It must pick a square and attempt an attack. This works like targeting a hidden creature (requiring a DC 11 flat check, as described on page 434), but the flat check and attack roll are rolled in secret by the GM, who doesn’t reveal whether the attack missed due to failing the flat check, failing the attack roll, or choosing the wrong square. They can ${convertToHardcodedLink('action', 'Seek')} to try to find you.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Unfriendly',
    description: `This condition reflects a creature’s disposition toward a particular character, and only supernatural effects (like a spell) can impose this condition on a PC. A creature that is unfriendly to a character dislikes and distrusts that character. The unfriendly creature won’t accept Requests from the character.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Unnoticed',
    description: `If you’re unnoticed by a creature, that creature has no idea you’re present. When you’re unnoticed, you’re also undetected. This matters for abilities that can be used only against targets totally unaware of your presence.`,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Wounded',
    description: `You have been seriously injured. If you lose the dying condition and do not already have the wounded condition, you become wounded 1. If you already have the wounded condition when you lose the dying condition, your wounded condition value increases by 1. If you gain the dying condition while wounded, increase your dying condition value by your wounded value.
    The wounded condition ends if someone successfully restores Hit Points to you using ${convertToHardcodedLink('action', 'Treat Wounds')}, or if you are restored to full Hit Points by any means and rest for 10 minutes.`,
    value: 1,
    for_creature: true,
    for_object: false,
  },
  {
    name: 'Glitching',
    description: `Glitching is a condition that affects objects or creatures with the tech trait, and it always includes a value. A glitching creature or object experiences a combination of debilitating effects and moments of seizing up. If you have glitching equipment and take any action involving that equipment, you must attempt a DC 10 flat check to see what occurs. If you have the glitching condition on yourself, you must make this flat check at the beginning of every round.
    \n\n**Critical Success** Reduce the glitching value by 1.
    \n\n**Success** You act as normal or use your equipment as normal.
    \n\n**Failure** You take an item penalty on all your checks and DCs equal to your glitching value or the glitching value on the item you’re attempting to use.
    \n\n**Critical Failure** You count as stunned 1 for the round. Alternatively, the object you tried to use doesn’t function, and you lose the actions you took to attempt to use it.
    `,
    value: 1,
    for_creature: true,
    for_object: true,
    starfinder_only: true,
  },
  {
    name: 'Suppressed',
    description: `You have been affected by a high volume of incoming fire or a particularly dangerous attack that forces you to act less efficiently for your own safety. You take a –1 circumstance penalty on attack rolls and a –10-foot status penalty to your Speed.`,
    for_creature: true,
    for_object: false,
    starfinder_only: true,
  },

  // TODO, Temp solution to include auto-detected rules here.
  // Set everything false so they don't show up in modal
  {
    name: 'Fast Healing',
    description: `You regain the given number of Hit Points each round at the beginning of your turn.`,
    for_creature: false,
    for_object: false,
  },
  {
    name: 'Forced Movement',
    description: `When an effect forces you to move, or if you start falling, the distance you move is defined by the effect that moved you, not by your Speed. Forced movement doesn't trigger reactions that are triggered by movement. In the rare cases where it's unclear whether your movement is voluntary or forced, the GM makes the determination.
    If forced movement would move you into a space you can't occupy—because objects are in the way or because you lack the movement type needed to reach it, for example—you stop moving in the last space you can occupy.
    Usually the creature or effect forcing the movement chooses the path the victim takes. If you're pushed or pulled, you can usually be moved through hazardous terrain, pushed off a ledge, or the like. Abilities that reposition you in some other way can't put you in such dangerous places unless they specify otherwise. In all cases, the GM makes the final call if there's doubt on where forced movement can move a creature.
    Some abilities allow a creature to move while carrying another along with it. This is forced movement for the carried creature. Unless noted otherwise, they both move on the same path while this happens—the carrying creature can't drag its victim through dangers while avoiding them itself, for example.`,
    for_creature: false,
    for_object: false,
  },
];

export function getConditionByName(name: string, addedSource?: string): Condition | undefined {
  const foundCondition = cloneDeep(
    CONDITIONS.find((condition) => condition.name.trim().toLowerCase() === name.trim().toLowerCase())
  );
  if (foundCondition) {
    foundCondition.source = addedSource;
  }
  return foundCondition;
}

export function getAllConditions() {
  return cloneDeep(CONDITIONS).filter(
    (condition) =>
      (condition.starfinder_only && isPlayingStarfinder()) ||
      (condition.pathfinder_only && isPlayingPathfinder()) ||
      (!condition.starfinder_only && !condition.pathfinder_only)
  );
}

export function applyConditions(id: StoreID, conditions: Condition[]) {
  compiledConditions(conditions).forEach((condition) => {
    applyCondition(id, condition);
  });
}

// Applies cascading and overriding conditions
export function compiledConditions(conditions: Condition[]): Condition[] {
  let newConditions: Condition[] = [];

  const processConditions = () => {
    for (const condition of [...conditions, ...newConditions]) {
      if (condition.name === 'Blinded') {
        newConditions = newConditions.filter((cond) => cond.name !== 'Dazzled');
      }
      if (condition.name === 'Confused') {
        newConditions.push(getConditionByName('Off-guard', 'Confused')!);
      }
      if (condition.name === 'Dying') {
        newConditions.push(getConditionByName('Unconscious', 'Dying')!);
      }
      if (condition.name === 'Encumbered') {
        newConditions.push(getConditionByName('Clumsy', 'Encumbered')!);
      }
      if (condition.name === 'Grabbed') {
        newConditions.push(getConditionByName('Off-guard', 'Grabbed')!);
        newConditions.push(getConditionByName('Immobilized', 'Grabbed')!);
      }
      if (condition.name === 'Paralyzed') {
        newConditions.push(getConditionByName('Off-guard', 'Paralyzed')!);
      }
      if (condition.name === 'Prone') {
        newConditions.push(getConditionByName('Off-guard', 'Prone')!);
      }
      if (condition.name === 'Restrained') {
        newConditions = newConditions.filter((cond) => cond.name !== 'Grabbed');
        newConditions.push(getConditionByName('Off-guard', 'Restrained')!);
        newConditions.push(getConditionByName('Immobilized', 'Restrained')!);
      }
      if (condition.name === 'Stunned') {
        newConditions = newConditions.filter((cond) => cond.name !== 'Slowed');
      }
      if (condition.name === 'Unconscious') {
        newConditions.push(getConditionByName('Off-guard', 'Unconscious')!);
        newConditions.push(getConditionByName('Blinded', 'Unconscious')!);
        newConditions.push(getConditionByName('Prone', 'Unconscious')!);
      }
      if (condition.name === 'Unnoticed') {
        newConditions.push(getConditionByName('Undetected', 'Unnoticed')!);
      }
      newConditions.push(condition);
    }
  };
  // Run it twice to make sure we got all the conditions,
  processConditions();
  processConditions();

  // Remove duplicates
  return uniqWith(newConditions, (a, b) => a.name === b.name).sort((a, b) => a.name.localeCompare(b.name));
}

function applyCondition(id: StoreID, condition: Condition) {
  if (condition.name === 'Blinded') {
    const preciseSenses = getVariable<VariableListStr>(id, 'SENSES_PRECISE');
    const visionSenses = preciseSenses?.value.filter((sense) => sense.includes('VISION')) ?? [];
    // Check if vision is the only precise sense
    if (preciseSenses?.value.length === visionSenses.length) {
      addVariableBonus(id, 'PERCEPTION', -4, 'status', '', 'Blinded');
    }

    addVariableBonus(
      id,
      'PERCEPTION',
      undefined,
      undefined,
      'You automatically critically fail Perception checks that require you to be able to see.',
      'Blinded'
    );
    adjVariable(id, 'IMMUNITIES', 'VISUAL-EFFECTS', 'Blinded');
    return;
  }
  if (condition.name === 'Broken') {
    return;
  }
  if (condition.name === 'Clumsy') {
    const penalty = -1 * (condition.value ?? 0);
    addVariableBonus(id, 'AC_BONUS', penalty, 'status', '', `Clumsy ${condition.value}`);
    const dexSaves = getAllSaveVariables(id).filter((save) => save.value.attribute === 'ATTRIBUTE_DEX');
    for (const save of dexSaves) {
      addVariableBonus(id, save.name, penalty, 'status', '', `Clumsy ${condition.value}`);
    }
    const dexSkills = getAllSkillVariables(id).filter((skill) => skill.value.attribute === 'ATTRIBUTE_DEX');
    for (const skill of dexSkills) {
      addVariableBonus(id, skill.name, penalty, 'status', '', `Clumsy ${condition.value}`);
    }
    addVariableBonus(id, 'DEX_ATTACK_ROLLS_BONUS', penalty, 'status', '', `Clumsy ${condition.value}`);
    // Wording says only checks, so don't add to damage rolls
    return;
  }
  if (condition.name === 'Concealed') {
    return;
  }
  if (condition.name === 'Confused') {
    return;
  }
  if (condition.name === 'Controlled') {
    return;
  }
  if (condition.name === 'Dazzled') {
    const preciseSenses = getVariable<VariableListStr>(id, 'SENSES_PRECISE');
    const visionSenses = preciseSenses?.value.filter((sense) => sense.includes('VISION')) ?? [];
    // Check if vision is the only precise sense
    if (preciseSenses?.value.length === visionSenses.length) {
      addVariableBonus(
        id,
        'PERCEPTION',
        undefined,
        undefined,
        'All creatures and objects are concealed from you.',
        'Dazzled'
      );
    }
    return;
  }
  if (condition.name === 'Deafened') {
    addVariableBonus(
      id,
      'PERCEPTION',
      -2,
      'status',
      '-2 status penalty to initiative and checks that involve sound but also rely on other senses',
      'Deafened'
    );
    addVariableBonus(
      id,
      'PERCEPTION',
      undefined,
      undefined,
      'You automatically critically fail Perception checks that require you to be able to hear.',
      'Deafened'
    );
    adjVariable(id, 'IMMUNITIES', 'AUDITORY-EFFECTS', 'Deafened');
    return;
  }
  if (condition.name === 'Doomed') {
    return;
  }
  if (condition.name === 'Drained') {
    const penalty = -1 * (condition.value ?? 0);
    const conSaves = getAllSaveVariables(id).filter((save) => save.value.attribute === 'ATTRIBUTE_CON');
    for (const save of conSaves) {
      addVariableBonus(id, save.name, penalty, 'status', '', `Drained ${condition.value}`);
    }
    const conSkills = getAllSkillVariables(id).filter((skill) => skill.value.attribute === 'ATTRIBUTE_CON');
    for (const skill of conSkills) {
      addVariableBonus(id, skill.name, penalty, 'status', '', `Drained ${condition.value}`);
    }
    const level = getVariable<VariableNum>(id, 'LEVEL')?.value ?? 0;
    addVariableBonus(id, 'MAX_HEALTH_BONUS', penalty * Math.max(level, 1), 'status', '', `Drained ${condition.value}`);
    return;
  }
  if (condition.name === 'Dying') {
    return;
  }
  if (condition.name === 'Encumbered') {
    for (const speed of getAllSpeedVariables(id)) {
      addVariableBonus(id, speed.name, -10, undefined, '', `Encumbered`);
    }
    return;
  }
  if (condition.name === 'Enfeebled') {
    const penalty = -1 * (condition.value ?? 0);
    const strSaves = getAllSaveVariables(id).filter((save) => save.value.attribute === 'ATTRIBUTE_STR');
    for (const save of strSaves) {
      addVariableBonus(id, save.name, penalty, 'status', '', `Enfeebled ${condition.value}`);
    }
    const strSkills = getAllSkillVariables(id).filter((skill) => skill.value.attribute === 'ATTRIBUTE_STR');
    for (const skill of strSkills) {
      addVariableBonus(id, skill.name, penalty, 'status', '', `Enfeebled ${condition.value}`);
    }
    addVariableBonus(id, 'STR_ATTACK_ROLLS_BONUS', penalty, 'status', '', `Enfeebled ${condition.value}`);
    addVariableBonus(id, 'STR_ATTACK_DAMAGE_BONUS', penalty, 'status', '', `Enfeebled ${condition.value}`);
    return;
  }
  if (condition.name === 'Fascinated') {
    addVariableBonus(id, 'PERCEPTION', -2, 'status', '', 'Fascinated');
    for (const skill of getAllSkillVariables(id)) {
      addVariableBonus(id, skill.name, -2, 'status', '', 'Fascinated');
    }
    return;
  }
  if (condition.name === 'Fatigued') {
    addVariableBonus(id, 'AC_BONUS', -1, 'status', '', 'Fatigued');
    for (const save of getAllSaveVariables(id)) {
      addVariableBonus(id, save.name, -1, 'status', '', 'Fatigued');
    }
    return;
  }
  if (condition.name === 'Fleeing') {
    return;
  }
  if (condition.name === 'Friendly') {
    return;
  }
  if (condition.name === 'Frightened') {
    const penalty = -1 * (condition.value ?? 0);
    for (const skill of getAllSkillVariables(id)) {
      addVariableBonus(id, skill.name, penalty, 'status', '', `Frightened ${condition.value}`);
    }
    for (const save of getAllSaveVariables(id)) {
      addVariableBonus(id, save.name, penalty, 'status', '', `Frightened ${condition.value}`);
    }
    addVariableBonus(id, 'ATTACK_ROLLS_BONUS', penalty, 'status', '', `Frightened ${condition.value}`);
    addVariableBonus(id, 'SPELL_DC', penalty, 'status', '', `Frightened ${condition.value}`);
    addVariableBonus(id, 'PERCEPTION', penalty, 'status', '', `Frightened ${condition.value}`);
    addVariableBonus(id, 'CLASS_DC', penalty, 'status', '', `Frightened ${condition.value}`);
    addVariableBonus(id, 'AC_BONUS', penalty, 'status', '', `Frightened ${condition.value}`);
    return;
  }
  if (condition.name === 'Grabbed') {
    return;
  }
  if (condition.name === 'Helpful') {
    return;
  }
  if (condition.name === 'Hidden') {
    return;
  }
  if (condition.name === 'Hostile') {
    return;
  }
  if (condition.name === 'Immobilized') {
    return;
  }
  if (condition.name === 'Indifferent') {
    return;
  }
  if (condition.name === 'Invisible') {
    return;
  }
  if (condition.name === 'Observed') {
    return;
  }
  if (condition.name === 'Off-guard') {
    addVariableBonus(id, 'AC_BONUS', -2, 'circumstance', '', 'Off-guard');
    return;
  }
  if (condition.name === 'Paralyzed') {
    return;
  }
  if (condition.name === 'Persistent Damage') {
    return;
  }
  if (condition.name === 'Petrified') {
    return;
  }
  if (condition.name === 'Prone') {
    addVariableBonus(id, 'ATTACK_ROLLS_BONUS', -2, 'circumstance', '', 'Prone');
    return;
  }
  if (condition.name === 'Quickened') {
    return;
  }
  if (condition.name === 'Restrained') {
    return;
  }
  if (condition.name === 'Sickened') {
    const penalty = -1 * (condition.value ?? 0);
    for (const skill of getAllSkillVariables(id)) {
      addVariableBonus(id, skill.name, penalty, 'status', '', `Sickened ${condition.value}`);
    }
    for (const save of getAllSaveVariables(id)) {
      addVariableBonus(id, save.name, penalty, 'status', '', `Sickened ${condition.value}`);
    }
    addVariableBonus(id, 'ATTACK_ROLLS_BONUS', penalty, 'status', '', `Sickened ${condition.value}`);
    addVariableBonus(id, 'SPELL_DC', penalty, 'status', '', `Sickened ${condition.value}`);
    addVariableBonus(id, 'PERCEPTION', penalty, 'status', '', `Sickened ${condition.value}`);
    addVariableBonus(id, 'CLASS_DC', penalty, 'status', '', `Sickened ${condition.value}`);
    addVariableBonus(id, 'AC_BONUS', penalty, 'status', '', `Sickened ${condition.value}`);
    return;
  }
  if (condition.name === 'Slowed') {
    return;
  }
  if (condition.name === 'Stunned') {
    return;
  }
  if (condition.name === 'Stupefied') {
    const penalty = -1 * (condition.value ?? 0);
    const attrs = ['ATTRIBUTE_INT', 'ATTRIBUTE_WIS', 'ATTRIBUTE_CHA'];
    const saves = getAllSaveVariables(id).filter((save) => attrs.includes(save.value.attribute ?? ''));
    for (const save of saves) {
      addVariableBonus(id, save.name, penalty, 'status', '', `Stupefied ${condition.value}`);
    }
    const skills = getAllSkillVariables(id).filter((skill) => attrs.includes(skill.value.attribute ?? ''));
    for (const skill of skills) {
      addVariableBonus(id, skill.name, penalty, 'status', '', `Stupefied ${condition.value}`);
    }
    addVariableBonus(id, 'SPELL_ATTACK', penalty, 'status', '', `Stupefied ${condition.value}`);
    addVariableBonus(id, 'SPELL_DC', penalty, 'status', '', `Stupefied ${condition.value}`);
    addVariableBonus(id, 'PERCEPTION', penalty, 'status', '', `Stupefied ${condition.value}`);
    const classDC = getVariable<VariableProf>(id, 'CLASS_DC');
    if (classDC && attrs.includes(classDC.value.attribute ?? '')) {
      addVariableBonus(id, 'CLASS_DC', penalty, 'status', '', `Stupefied ${condition.value}`);
    }
    return;
  }
  if (condition.name === 'Unconscious') {
    addVariableBonus(id, 'AC_BONUS', -4, 'status', '', `Unconscious`);
    addVariableBonus(id, 'PERCEPTION', -4, 'status', '', `Unconscious`);
    addVariableBonus(id, 'SAVE_REFLEX', -4, 'status', '', `Unconscious`);
    return;
  }
  if (condition.name === 'Undetected') {
    return;
  }
  if (condition.name === 'Unfriendly') {
    return;
  }
  if (condition.name === 'Unnoticed') {
    return;
  }
  if (condition.name === 'Wounded') {
    return;
  }
  if (condition.name === 'Glitching') {
    return;
  }
  if (condition.name === 'Suppressed') {
    addVariableBonus(id, 'ATTACK_ROLLS_BONUS', -1, 'circumstance', '', `Suppressed`);
    addVariableBonus(id, 'SPEED', -10, 'status', '', `Suppressed`);
    return;
  }
}
