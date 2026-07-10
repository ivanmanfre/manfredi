# client-onboarding

A skill plus four stage agents that run a signed client from intake form to first deliverables, with the founder as the approve gate instead of the bottleneck.

Most agencies open a single chat, paste the intake, and type "onboard this client." The output reads fine for ten seconds, then you notice it is off-voice and generic, so you rewrite it. The founder stays in the loop and the bottleneck moves one inch down the line. A founder reviewing four sharp drafts spends six minutes. A founder rewriting one mushy draft spends forty. This stack produces the first situation every time.

## Install

```
/plugin marketplace add ivanmanfre/manfredi
/plugin install client-onboarding@manfredi
```

## The stack

| Layer | What it owns |
|---|---|
| `client-onboarding` skill | Your SOP and voice rules, read by every stage |
| `fundamentals` agent | Name, site, audience, problems solved |
| `action-brief` agent | 30-day priorities and the first move |
| `linkedin-branding` agent | Headline + About section |
| `outreach` agent | DM scripts and the micro-offer |
| Approve / revise loop | Feeds approved drafts back as examples, so quality compounds |

## Run your first client through it

1. **Wire the intake:** map your form fields into the `INTAKE` variable. One submission fills all four stages.
2. **Seed the examples:** paste one strong past document per stage into `APPROVED_EXAMPLES` before the first run, so the agents have a voice to copy.
3. **Run in order:** fundamentals first, approve it, then its output feeds the next three agents.
4. **Gate every draft:** read the CONFIDENCE FLAG first, approve or revise, and let approvals accrue. By client three the revision rate drops noticeably.

Time cost before: 30-50 minutes of founder time per client. After: roughly 8-12 minutes of review. The loop is the asset: after ten approved clients the examples carry the voice so well most stages need zero revision.

## Want it wired into your intake for real

I connect this to your actual form, CRM, and approval flow so it runs without copy-paste. Book a free fit call: **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
