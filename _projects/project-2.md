---
title: "IMDB-Style Movie Database Engine"
excerpt: "Python · Data Structures · Top-K Analytics"
collection: projects
date: 2025-12-11
---

## Tech Stack

Python · Hash Tables · Heaps · CSV/Pickle Pipeline

## Overview

Engineered a custom movie database system from raw CSV datasets, supporting scalable search and analytics.

## GitHub Repository

[View Repository](https://github.com/tylerbandura/ECE-3822-Final-Project)

## Key Contributions

- Implemented core data structures from scratch, including hash tables with chaining, dynamic arrays, and heaps.
- Built indexing layers (movieId to movie, title to movie) achieving near O(1) lookup performance.
- Designed a top-K ranking system using a min-heap to efficiently track highest-rated or highest-revenue movies.
- Optimized the data pipeline by precomputing and serializing datasets (pickle), reducing repeated parsing overhead.
