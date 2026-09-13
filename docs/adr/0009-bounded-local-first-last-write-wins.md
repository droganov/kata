# Bounded local-first: last write wins

The network is required to start a Session. Once loaded, a Session runs to the end locally; marks queue on the device and are sent when the connection returns, with no action from the person. There is no sync engine and no conflict resolution: the last write wins. Offline state is detected by failed requests, not `navigator.onLine`, which reports "online" on a Wi-Fi hotspot without internet.

## Considered Options

- A real local-first sync engine: out of scope for now, a phase of its own.
