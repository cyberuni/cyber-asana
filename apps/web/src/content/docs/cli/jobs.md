---
title: Jobs
description: Read the async jobs Asana returns for work it runs in the background.
sidebar:
  order: 22
---

Asana runs some operations in the background and answers with a job. `job get` reads one.

```sh
cyber-asana job get <gid>
```

Poll the job until its status is `succeeded` or `failed`. A succeeded job carries the record it
built, such as `new_task` for a task template or `new_project` for a project template.

You rarely need this command. `project-template instantiate` and `task-template instantiate`
poll the job for you and print the result; `--no-wait` skips the poll and returns the job GID
for you to read here. The MCP tool is `asana_job_get`.
