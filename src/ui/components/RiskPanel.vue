<script setup lang="ts">
import type { Risk } from '../../core/models';
import { formatWeightKg, weightUnitLabel, type UnitSystem } from '../../core/units';
defineProps<{ risks: Risk[]; unit: UnitSystem }>();
</script>

<template><aside class="risk-panel"><div class="section-title"><div><span>RISK SCAN</span><h2>装箱风险</h2></div><b>{{ risks.filter(r => r.severity !== 'info').length }}</b></div><article v-for="risk in risks" :key="risk.id" :class="['risk-row', risk.severity]"><i>{{ risk.severity === 'critical' ? '!' : risk.severity === 'warning' ? '△' : '✓' }}</i><div><strong>{{ risk.title }}</strong><p>{{ risk.message }}<template v-if="risk.weightOverrunKg !== undefined">超出承重 {{ formatWeightKg(risk.weightOverrunKg, unit) }} {{ weightUnitLabel(unit) }}。</template></p></div></article></aside></template>
