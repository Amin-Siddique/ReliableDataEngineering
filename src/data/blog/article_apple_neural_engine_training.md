---
title: "Someone Reverse-Engineered Apple's Neural Engine. Then Trained a 600M Parameter Model on It."
description: "Apple locked down the ANE for inference only. A weekend project cracked it open for training. The results are real, the limitations are stated up front, and Apple probably isn't thrilled."
pubDatetime: 2026-03-25
tags:
  - apple-silicon
  - machine-learning
  - reverse-engineering
  - neural-engine
ogImage: "/images/blog/apple-neural-engine-training.webp"
---

# Someone Reverse-Engineered Apple's Neural Engine. Then Trained a 600M Parameter Model on It.

*Apple locked down the ANE for inference only. A weekend project cracked it open for training. The results are real, the limitations are stated up front, and Apple probably isn't thrilled.*

---

*Machine Learning | Apple Silicon | Reverse Engineering | March 2026*
*~14 min read*

---

## The Chip Apple Doesn't Want You to Touch

Every Mac, iPad, and iPhone sold in the last four years has a chip inside it that almost nobody uses directly.

The Apple Neural Engine. 15.8 TFLOPS of FP16 compute on the M4. That's serious throughput sitting right there on the die, next to the CPU and GPU. For context, 15.8 TFLOPS is more raw FP16 compute than a 2018-era discrete GPU. It's a real processor, not a marketing line item.

Apple exposes it through CoreML, but only for inference. Feed a pre-trained model in, get predictions out. Training (the computationally expensive process of actually teaching a model) is explicitly not supported. Apple's position: use the GPU for that. Or Metal. Or their MLX framework. Just don't touch the Neural Engine for training. That's not what it's for.

This makes a certain amount of sense from Apple's perspective. The ANE has a narrow, optimized architecture. Keeping the API surface limited means fewer support headaches and fewer developers filing radar bugs about edge cases in hardware they don't fully understand. But it also means a large fraction of on-die compute goes unused for an entire category of workloads.

A developer who goes by maderix disagreed. Over a series of weekends, they reverse-engineered the private `_ANEClient` and `_ANECompiler` APIs, figured out how to compile custom compute graphs at runtime, and got backpropagation running directly on the Neural Engine. The approach required no jailbreaking, no kernel extensions, and no modified system binaries. Everything runs in userspace on a stock macOS installation.

Then they trained a 600-million parameter language model on it.

The repo has 6,000+ stars and three blog posts that walk through the entire journey. The README is unusually candid about what works, what doesn't, and where the hype outruns the reality.

---

## What "Reverse-Engineered" Actually Means Here

The Neural Engine has no public programming interface for custom compute. Apple provides CoreML, which takes a pre-exported model (in `.mlmodel` or `.mlpackage` format), compiles it for the ANE, and runs inference. There's no "write an arbitrary matrix multiplication and run it on the ANE" API.

Except there is. It's just private. Apple ships the frameworks on every Mac, and the symbols are there if you know where to look. They're prefixed with underscores (the universal "don't touch this" convention), but Objective-C's runtime makes them callable regardless.

Through runtime introspection (`objc_msgSend`, which lets you call any method on any object at runtime), maderix discovered three private classes:

| Class | Purpose |
| ----- | ------- |
| `_ANEClient` | Manages the connection to the Neural Engine hardware |
| `_ANECompiler` | Compiles compute graphs into ANE-executable programs |
| `_ANEInMemoryModelDescriptor` | Compiles MIL text directly into ANE programs, no disk I/O needed |

MIL is Apple's internal intermediate representation for neural network operations. It's a text format that describes convolutions, matrix multiplications, softmax operations, and element-wise math. Normally, Xcode's CoreML tools generate MIL from higher-level model descriptions, and developers never see it. The ANE project generates it programmatically at runtime using Objective-C string construction, which is a bit like writing assembly by concatenating strings. It works, but the developer experience is about what you'd expect.

```python
# The ANE project generates MIL like this (simplified):
conv(x, weight, bias, pad="valid", strides=[1,1])
matmul(queries, keys_transposed)
softmax(attention_scores, axis=-1)
```

The important discovery: `_ANEInMemoryModelDescriptor` can compile MIL text plus raw weight blobs directly into ANE programs without writing anything to disk. Weights can be updated after a backward pass and the program recompiled in-memory. That makes training possible. Without this class, every weight update would require a round-trip through the filesystem, and the I/O overhead would make training impractically slow.

---

## What the Benchmarks Look Like

Two models have been trained successfully on the ANE:

| Model | Parameters | Step Time | Notes |
| ----- | ---------- | --------- | ----- |
| stories110m | 110M | ~85 ms/step | Small model, fast iteration |
| Qwen3-0.6B | 600M | ~412 ms/step | Largest model trained on ANE |

Both use the same pipeline: forward pass on ANE, backward dx (input gradients) on ANE, backward dW (weight gradients) on CPU via Accelerate's BLAS, Adam optimizer on CPU.

Why split the work? ANE is fast at matrix multiplications (convolutions, attention), but CPU with BLAS handles weight gradient accumulations better because the memory access patterns are different. Weight gradients involve reductions across the batch dimension, which means lots of scattered reads and accumulations. The CPU's cache hierarchy and BLAS routines are well-suited to that. The ANE, with its fixed dataflow architecture, is not. Each processor does what it's good at.

The 412 ms/step for Qwen3-0.6B might not sound impressive next to a dedicated GPU, and it isn't. But consider the context: this is a 600M parameter model training on a chip that Apple says cannot train at all, using APIs that are not supposed to exist. The speed is secondary to the fact that it works.

Beyond the raw step times, INT8 quantization roughly doubles throughput:

| Precision | Throughput | Memory Bandwidth |
| --------- | ---------- | ---------------- |
| FP16 | 1x baseline | Full |
| INT8 activations | ~2x | Halved |

INT8 activations halve the bandwidth needed between ANE tiles by reducing data size in the L2 SRAM cache. Weights use `constexpr_affine_dequantize`, stored as int8 and dequantized to fp16 at compile time. A real performance gain from a quantization path that ANE's hardware was apparently designed to support, even though Apple never exposed it.

---

## The Engineering That Makes It Work

Several non-obvious problems had to be solved.

**Dynamic weights without recompilation.** The naive approach: compile the model with weights as constants, train one step, recompile with updated weights, repeat. This works but the ANE compiler is slow, on the order of hundreds of milliseconds per compilation. For a training loop that needs to update weights every step, that overhead would dominate the total runtime. The solution: pack activations and weights into a single spatial input dimension, then slice them apart inside the MIL kernel. Weights become inputs, not constants. The compiled program stays the same; only the input data changes. No recompilation when weights change.

**The 119-compile limit.** ANE's compiler leaks resources. After approximately 119 compilations per process, it stops working. The number 119 is not a round power of two or a known buffer size, so this is likely an internal resource pool that was never designed for repeated allocation. The workaround: `exec()` restart. The training process saves a checkpoint, calls `exec()` to restart itself, loads the checkpoint, and continues. Ugly, but it works, and it reveals a genuine bug in Apple's private API that Apple has no reason to fix since nobody is supposed to be calling these functions.

**FP16 gradient underflow.** Backward-pass matrix multiplications produce very small gradients that underflow to zero in fp16. The deeper the network, the worse this gets, because gradients shrink as they propagate backward through layers. Fix: global loss scaling with a factor of `256 * NLAYERS`. Multiply the loss before the backward pass, compute gradients in the scaled space, then divide by the same factor afterward. This is standard mixed-precision training practice (PyTorch and TensorFlow both do it automatically), but it has to be done manually here because ANE only does fp16 and there's no framework handling it.

**Single-input constraint.** ANE requests with multiple inputs cause a `0x1d` error, with no helpful error message explaining why. Everything (activations, weights, bias terms) must be packed into a single input tensor along the spatial dimension, then unpacked inside the kernel using hardcoded offsets and slicing.

**Channel-first memory layout.** ANE's IOSurface format is `[1, C, 1, S]` (batch, channels, height, spatial). Most ML frameworks default to row-major or channels-last layouts, which would require a transpose every time data moves between CPU and ANE. Keeping the CPU-side data in channel-first layout from the start eliminates those transpositions entirely. A small change with a big effect on throughput, especially when data crosses the boundary multiple times per layer.

---

## Where It Falls Short

The README devotes an entire section to tempering expectations. Here's the gist:

**Utilization is low.** The ANE achieves 5-9% of its theoretical peak TFLOPS during training. The bottleneck is CPU fallback: many element-wise operations (RMSNorm, residual connections, loss computation) still run on CPU. The ANE sits idle during those operations. To put 5-9% in perspective, GPU training frameworks typically achieve 30-50% of peak FLOPS on similar model sizes. The gap is large.

**This doesn't replace GPU training.** For any model larger than a few hundred million parameters, GPU training (via Metal, MLX, or CUDA on an external GPU) will be faster. An M4's GPU running MLX can train a comparable model with higher utilization and without any private API gymnastics. The ANE training pipeline is a research demonstration, not a production framework.

**Causal masking is awkward.** ANE's SDPA (scaled dot-product attention) hardware ignores attention masks. Causal attention has to be decomposed: Q@K^T runs on ANE, masking and softmax run on CPU, then scores@V goes back to ANE. Three transfers per attention layer instead of one fused operation. Each transfer crosses the CPU-ANE boundary, which involves IOSurface synchronization overhead.

**It could break with any macOS update.** The private APIs have no stability guarantee. Apple could change or remove `_ANEClient` and `_ANECompiler` whenever they want. One OS update could kill the project. The repo targets macOS 15+ on Apple Silicon (tested on M4). Anyone building on top of this should plan for the possibility that it stops working six months from now.

maderix is direct about the project's scope:

> This is a research project, not a production framework. Some coverage has overstated its implications. Training works, but utilization is low (~5-9% of peak) with significant engineering challenges remaining.

That level of self-assessment is rare in a repo with 6,000 stars. Open source projects with this much attention usually lean into the hype rather than against it.

---

## The Legal Question

The project treads carefully here, and the README spends real space on it. It cites *Sega v. Accolade* (1992), where the U.S. Ninth Circuit ruled that reverse engineering for interoperability is protected under fair use. It also references DMCA 1201(f), which carves out an exemption for reverse engineering to achieve interoperability. These are standard citations in the reverse engineering world, and they apply cleanly to this situation: the project is trying to use purchased hardware for a purpose the manufacturer chose not to support in software.

No Apple proprietary code or binaries are included in the repository. The project discovers API signatures through Objective-C runtime introspection (a standard capability of the language) and constructs its own MIL programs from scratch. The weight blobs are generated by the training process, not extracted from Apple. This matters because the typical legal vulnerability in reverse engineering cases is when someone redistributes the original vendor's code. That's not happening here.

Apple hasn't responded publicly. They probably aren't pleased. But the legal footing here (runtime introspection of a programming language's own reflection capabilities for the purpose of hardware interoperability) has solid precedent. The more interesting question might be a practical one: if enough people start relying on these private APIs, does Apple face pressure to stabilize them, or do they actively break them in the next macOS release? History suggests the latter. Apple has a long track record of removing private API access when it gets too popular.

---

## The Bigger Point

The ANE training project argues something that goes beyond Apple.

Most consumer devices shipped today have a neural processing unit of some kind. Apple's ANE, Qualcomm's Hexagon, Intel's NPU, Google's Tensor TPU. These chips were designed for inference: running pre-trained models on-device for things like photo processing and voice recognition. Collectively, there are billions of NPU-equipped devices in the world, and almost none of them have ever run a training step.

But inference-only is a software restriction, not a hardware one. The silicon can do matrix multiplications, which is what training requires. Backpropagation is just matrix multiplication in reverse, plus some bookkeeping. The vendors chose to lock training out, likely to push training workloads to their cloud services (or, in Apple's case, to keep the API surface small and stable).

This project shows the hardware can train. The barrier is software, not capability. Whether vendors will eventually open their NPUs for training, or whether the community will keep reverse-engineering access, remains to be seen. There is no technical reason it has to be one or the other. Qualcomm has been slightly more open with Hexagon's compute capabilities; Apple has been more closed. Market pressure from projects like this one could shift the calculus.

For ML practitioners, the obvious question: what if every MacBook could train small models locally? Not GPT-5, but fine-tuning a 100M parameter model on personal data, entirely on-device, with nothing leaving the machine. The ANE is fast enough for that. NPUs burn far less energy per FLOP than GPUs, often by an order of magnitude. On a MacBook running on battery, that efficiency difference is the gap between "possible" and "practical."

The missing piece is official API support from Apple. This project is a pretty good argument for why they should consider providing it. But Apple optimizes for different things than the ML community does. They want stability, battery life, and a controlled developer experience. Letting people run arbitrary compute graphs on the ANE could mean thermal issues, battery drain complaints, and a flood of bug reports about hardware behavior that was never meant to be user-facing. The tension between openness and control is real, and there is no obvious resolution.

---

## Try It Yourself

```bash
# Requires macOS 15+ on Apple Silicon (tested on M4)
git clone https://github.com/maderix/ANE.git
cd ANE/training/training_dynamic
make MODEL=stories110m
./train --scratch
```

No external dependencies beyond system frameworks. Private APIs are resolved at runtime via `objc_msgSend`. The build is a plain Makefile, no Xcode project required.

- [GitHub repo](https://github.com/maderix/ANE) (6K+ stars, MIT License)
- [Part 1: Reverse engineering](https://github.com/maderix/ANE/blob/main/docs/part1.md)
- [Part 2: Benchmarks](https://github.com/maderix/ANE/blob/main/docs/part2.md)
- [Part 3: Training](https://github.com/maderix/ANE/blob/main/docs/part3.md)

---

*If you want to understand how neural network training actually works at the math level, [Designing Data-Intensive Applications](https://amzn.to/4lPlcr4) covers the distributed systems foundations that make large-scale ML possible.*

---

*Disclaimer: This article is based on the public repository, README, and blog posts for the ANE training project as of March 2026. The author has no affiliation with the project or its developer. This project uses Apple's private, undocumented APIs which may break with any macOS update. The project is not affiliated with or endorsed by Apple Inc. Performance numbers come from the developer's own benchmarks on M4 hardware and haven't been independently verified. Training on the ANE is a research demonstration with significant limitations, not a production-ready framework. Legal analysis in this article is informational and not legal advice. Use at your own risk.*
