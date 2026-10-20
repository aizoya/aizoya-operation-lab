# Run the development demo on your Mac

Extract the checkpoint ZIP into a new folder. Keep it separate from production projects.
Use Node.js 24. From Terminal inside that extracted folder:

```sh
npm ci --ignore-scripts
npm run doctor
npm run demo
```

Open http://127.0.0.1:3419 on that same Mac. No API key is needed for this working dashboard.
The prior checkpoint ran on Franklyn's Mac. This updated checkpoint has been verified in the development workspace; rehearse it on the Mac before presenting.

## Three-minute demonstration

1. Start with **50 guests**, chicken menu, **$1,500** budget, a service date at least three days ahead, no declared allergen, and **Inventory shortage** under Test a disruption.
2. Build the proposal. Show all five workers and **INVENTORY SHORTAGE**. There is no review button for a blocked proposal.
3. Click **Draft revision for 11 guests**, then **Rebuild revised proposal**. Keep the shortage scenario; do not invent replenishment.
4. Show the recalculated result: **$239.26** price before tax, **$167.48** estimated cost, **$71.78** contribution, **30.00%** contribution margin. This is not net profit.
5. Show **12 servings required**, **12 available**, **150 capacity**, saved evidence and unresolved human checks together.
6. Click **Watch Kitchen** and **Watch Finance** for short Masky talking-head explanations. All five roles have recordings. They are prerecorded for this exact representative recovery, not live AI inference. **Hear** reads current findings using browser speech for any mission. **Stop voice** stops either playback.
7. Inspect original/revision evidence. Record the local proposal review, then download the evidence packet. No offer, order, purchase or payment is sent.

Say: "AIZOYA catches an infeasible catering promise, proposes a smaller feasible order, and shows its contribution margin and evidence for human review. Five deterministic workers enforce the checks; Masky avatars explain the representative recovery."

The customer still must agree to reducing the order from 50 to 11 guests. This is a draft alternative, not fulfillment of the original request. Human recipe, handling, allergens and tax verification remain.

Do not claim live inference, net profit, real customer validation, food-safety clearance, production readiness or a clean Snyk result.

## Installing this update

Extract the updated ZIP into a **new folder**. Leave your previous folder intact so its saved local missions remain available. Run the three commands above in the new folder. Stop the old demo with Control-C first if port 3419 is in use. No additional provider account or credential is needed for these local assets.

The update includes the persistent-disclosure fix, clearer decision card, five Masky portraits and five prerecorded talking-head videos. Nothing is published by running it.

## API connection status

Franklyn reports creating a temporary OpenAI key on October 19, with All permissions and one-day expiry in AIZOYA Core. The secret has not been supplied to this workspace, and no live request has been made. Keep it in a password manager; do not include it in this ZIP, chat or screenshots.

The current optional agent definitions select `openai/gpt-6-luna-fast` through AI Gateway. Direct OpenAI authentication needs a deliberate routing configuration and model-access check; simply saving OPENAI_API_KEY does not connect this dashboard. Provider use and bounded test costs still need verification before live calls.

## Security limitations

Latest Snyk source scan retains one high JSON-response XSS finding and one medium HTTP finding. Local encoding/MIME tests pass, but scanner disposition remains open. The app binds only to loopback and must not be exposed publicly in this state. The npm audit also retains moderate dependency findings. Separate Snyk dependency-upload approval has not been granted.
