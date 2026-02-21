---
description: Build and deploy LocalFlowPlugins to the Tdarr Kubernetes PVC
disable-model-invocation: true
---

# Deploy Local Plugins to Tdarr

## Steps

1. **Build TypeScript**

```bash
cd /Users/mia/mia-riezebos/Tdarr_Plugins && npx tsc
```

2. **Find the Tdarr main pod**

```bash
kubectl -n media get pods -l app=tdarr-main -o name
```

3. **Copy compiled plugins (use `/.` to copy contents, not the directory itself)**

```bash
kubectl cp FlowPlugins/LocalFlowPlugins/. media/<pod-name>:/app/server/Tdarr/Plugins/FlowPlugins/LocalFlowPlugins/
```

4. **Fix ownership**

```bash
kubectl -n media exec <pod-name> -- chown -R 1000:1000 /app/server/Tdarr/Plugins/FlowPlugins/LocalFlowPlugins/
```

5. **Verify**

```bash
kubectl -n media exec <pod-name> -- find /app/server/Tdarr/Plugins/FlowPlugins/LocalFlowPlugins/ -name '*.js' -type f | sort
```

## Notes

- The `/.` suffix on the source path copies directory *contents* into the destination, avoiding a nested `LocalFlowPlugins/LocalFlowPlugins/` structure.
- Pod name changes on restart — always re-resolve it.
- Tdarr picks up new/changed plugins on the next flow run; no restart needed.
