# Alarms that page a person. Missing data is treated as breaching for the error alarm, so silence cannot hide an outage.
# YOUR TURN start
# HINT: a metric alarm needs namespace, metric_name, statistic, period, evaluation_periods, datapoints_to_alarm, threshold,
# HINT: comparison_operator and treat_missing_data. "2 of 3" means evaluation_periods = 3 and datapoints_to_alarm = 2.
# YOUR TURN end
