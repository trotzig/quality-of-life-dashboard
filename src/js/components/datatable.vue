<template lang="html">
  <div v-if="selected.length > 0 && metric.data" id="datatable">
    <div class="tablescroll">
      <v-simple-table class="datatable">
        <thead>
          <tr>
            <th>
              <span :title="$t(`geographies.${geography.id}.description`)" class="tooltip">{{ $t(`geographies.${geography.id}.name`) }}</span>
            </th>
            <th>
              {{ curYear }} {{ $t('strings.value') | capitalize }} <span v-if="metric.config.label">({{ $t('metricLabels.' + metric.config.label) }})</span>
            </th>
            <th v-if="metric.data.a">
              {{ $t('strings.accuracy') | capitalize }}
            </th>
            <th v-if="metric.years.length > 1">
              {{ $t('strings.trend') | capitalize }}<br>{{ trendStartYear }}-{{ trendEndYear }}
            </th>
            <th v-if="metric.config.raw_label">
              {{ $t('strings.numberOf') | capitalize }} {{ $t('metricLabels.' + metric.config.raw_label) }}
            </th>
            <th v-if="metric.years.length > 1 && metric.config.raw_label">
              {{ $t('strings.trend') | capitalize }}<br>{{ trendStartYear }}-{{ trendEndYear }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in dataTable" :key="row.geogIndex" @mouseover="highlight(row.geogIndex)" @mouseout="highlight([])">
            <td>{{ $i18n.locale === 'en' ? geography.label(row.geogIndex) : geography.label_es(row.geogIndex) }}</td>
            <td>{{ row.value }}</td>
            <td v-if="row.accuracy">
              &#177;{{ row.accuracy }}
            </td>
            <td v-if="metric.years.length > 1 && row.trend">
              <v-icon size="14px">
                {{ row.trend.icon }}
              </v-icon>{{ row.trend.label }}
            </td>
            <td v-if="row.rawValue">
              {{ row.rawValue }}
            </td>
            <td v-if="metric.years.length > 1 && row.rawTrend">
              <v-icon size="14px">
                {{ row.rawTrend.icon }}
              </v-icon>{{ row.rawTrend.label }}
            </td>
          </tr>
        </tbody>
      </v-simple-table>
    </div>
    <p class="text-right">
      <v-btn text href="data.csv" download class="download"
             @click="downloadTable('#datatable table')"
      >
        {{ $t('strings.download') | capitalize }}
      </v-btn>
    </p>
  </div>
</template>

<script>
import { mdiTrendingDown, mdiTrendingNeutral, mdiTrendingUp } from '@mdi/js';
import { mapState } from 'vuex';

import table2csv from '../modules/table2csv';
import { prettyNumber, round } from '../modules/number_format';
import isNumeric from '../modules/isnumeric';

export default {
  name: 'DataTable',
  computed: mapState({
    metric: 'metric',
    geography: 'geography',
    selected: 'selected',
    curYear: 'year',
    // If a year other than the final year is selected, the trend chart shows the trend that year until the present.
    // Otherwise, show the trend over the full length of data we have.
    trendStartYear(state) {
      if (state.year === state.metric.years[state.metric.years.length - 1]) return state.metric.years[0];
      return state.year;
    },
    trendEndYear(state) {
      return state.metric.years[state.metric.years.length - 1];
    },

    // Create the formatted data table. Each row is a selected geography.
    dataTable(state) {
      const trend = (geogIndex) => {
        const begin = state.metric.data.map[geogIndex][`y_${this.trendEndYear}`];
        const end = state.metric.data.map[geogIndex][`y_${this.trendStartYear}`];

        if (isNumeric(begin) && isNumeric(end)) {
          const trendVal = round(Number(begin), state.metric.config.decimals)
              - round(Number(end), state.metric.config.decimals);
          return {
            icon: this.trendIcon(trendVal),
            label: prettyNumber(trendVal,
              state.metric.config.decimals, state.metric.config.prefix,
              state.metric.config.suffix, state.metric.config.commas),
          };
        }
        return {
          icon: null,
          label: '--',
        };
      };

      const rawTrend = (geogIndex) => {
        const begin = state.metric.data.map[geogIndex][`y_${this.trendEndYear}`]
            * state.metric.data.w[geogIndex][`y_${this.trendEndYear}`];
        const end = state.metric.data.map[geogIndex][`y_${this.trendStartYear}`]
            * state.metric.data.w[geogIndex][`y_${this.trendStartYear}`];

        if (isNumeric(begin) && isNumeric(end)) {
          const trendVal = (begin - end) * (state.metric.config.suffix === '%' ? 0.01 : 1);
          return {
            icon: this.trendIcon(trendVal),
            label: prettyNumber(trendVal, 0),
          };
        }
        return {
          icon: null,
          trendVal: '--',
        };
      };

      const rawValue = geogIndex => state.metric.data.w[geogIndex] && prettyNumber(state.metric.data.w[geogIndex][`y_${state.year}`] * state.metric.data.map[geogIndex][`y_${state.year}`] * (state.metric.config.suffix === '%' ? 0.01 : 1), 0, state.metric.config.prefix);

      return state.selected.map(geogIndex => ({
        geogIndex,
        value: prettyNumber(state.metric.data.map[geogIndex][`y_${state.year}`], state.metric.config.decimals, state.metric.config.prefix, state.metric.config.suffix, state.metric.config.commas),
        accuracy: state.metric.config.accuracy && prettyNumber(state.metric.data.a[geogIndex][`y_${state.year}`], state.metric.config.decimals, state.metric.config.prefix, state.metric.config.suffix, state.metric.config.commas),
        trend: trend(geogIndex),
        rawValue: state.metric.config.raw_label && rawValue(geogIndex),
        rawTrend: state.metric.config.raw_label && state.metric.data.w[geogIndex] && rawTrend(geogIndex),
      }));
    },
  }),
  data: () => ({ mdiTrendingDown, mdiTrendingNeutral, mdiTrendingUp }),
  methods: {
    highlight(n) {
      this.$store.commit('setHighlight', n);
    },
    downloadTable(theTable) {
      // TODO: rewrite this?
      const csvData = table2csv(theTable);
      // i hate you ie
      if (window.navigator.msSaveBlob) {
        const blob = new Blob([csvData], { type: 'application/csv;charset=utf-8;' });
        navigator.msSaveBlob(blob, 'data.csv');
      } else {
        document.querySelector('#datatable .download').href = `data:text/csv;charset=utf-8;base64,${btoa(csvData)}`;
      }
    },
    trendIcon(num) {
      if (num === 0) {
        return this.mdiTrendingNeutral;
      } if (num > 0) {
        return this.mdiTrendingUp;
      }
      return this.mdiTrendingDown;
    },
  },
};
</script>

<style lang="css">
    #datatable {
        margin: 10px 15px;
    }

    #datatable table {
        width: 100%;
    }

    #datatable tbody tr, #datatable tbody td {
        height: 28px;
        padding: 5px 18px 5px 24px;
    }

    #datatable .tablescroll {
        max-height: 350px;
        overflow: auto;
    }

    #datatable p {
        margin-top: 10px;
    }

    #datatable .tooltip {
        border-bottom: 1px dashed rgba(0, 0, 0, .54);
    }

    #datatable .icon {
        vertical-align: middle;
        width: 24px;
        height: 24px;
    }
    .mdl-data-table th {
        line-height: initial;
    }
</style>
