export default defineNuxtPlugin(async () => {
  if (!('serviceWorker' in navigator)) return
  await navigator.serviceWorker.register('/sw.js')
})
