---
title: "My AI agents are the new target for attackers"
subtitle: "Governance, sandboxing and least privilege at company scale"
seoTitle: "My AI agents are the new target for attackers"
seoDescription: "How Cloudflare equipped the whole company with AI agents in under a year: governance, sandboxing, least privilege and Gatekeepers."
themes: ["AI agents", "Governance", "Agent security", "Cloudflare OS"]
illustration:
  alt: "A figure seen from behind watches a stream of data scroll past, overlaid on a city at night"
---

By 2026, everyone has an agent. Almost nobody has governance.

At Cloudflare, the whole company was equipped in under a year, and merge velocity doubled. What made the difference was not the model we picked. It was the architecture around it.

This talk explains why we built our own AI stack, and the decisions that followed: centralizing every model call behind a single gateway, moving security to the network layer instead of into each tool, governing access to internal data by identity, and running agent-generated code in an isolated environment.

We’ll talk architecture, results and terminal, and we’ll stand behind one opinion: the harness and the model are two separate things.

We’ll cover:

- running generated code in sandboxed environments, with outbound access filtering;
- controlling data access through identity and least privilege;
- protecting against leaks of secrets and sensitive data;
- centralizing model calls, with no API keys on user machines;
- preventing generated applications from being exposed publicly by accident.

We’ll illustrate this with Cloudflare OS, our open source harness, and in particular its Gatekeepers mechanism. They provide stronger security than a classic MCP integration: each agent or application gets only the capabilities it strictly needs, actions are logged, and sensitive operations can require human approval.

The project and the details of this architecture:

- [Cloudflare OS](https://github.com/cloudflare/cloudflare-os)
- [How the Gatekeepers work](https://github.com/cloudflare/cloudflare-os#gatekeepers-a-capability-based-security-layer)
- [The sandbox and access control model](https://github.com/cloudflare/cloudflare-os#sandboxed-and-secure-by-default)
