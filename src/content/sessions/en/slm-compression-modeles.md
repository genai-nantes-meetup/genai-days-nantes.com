---
title: "My model doesn’t fit on an embedded chip"
subtitle: "Small language models, fine-tuning & compression"
seoTitle: "My model doesn’t fit on an embedded chip"
themes: ["SLM", "Model compression", "Embedded AI"]
illustration:
  alt: "A person interacting with a compact AI model"
---

Today, most AI runs in the cloud. Does it have to? This talk shows in practical terms how to run a capable language model locally, on a PC or a board like the Jetson Nano.

In a constrained environment, arbitrarily shrinking a model isn’t enough. We’ll look at how SLMs (Small Language Models) maintain good performance through different approaches: trimming, quantization, pruning and fine-tuning. We’ll then go further by comparing these optimization techniques with another approach: designing architectures built natively for the edge, and therefore suited to compute constraints from the start.
