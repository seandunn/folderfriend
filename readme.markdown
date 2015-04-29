# Folding Bike Route Planner

A proof of concept route planner for folding bike users.

Google Maps offers routing for cyclists and for public transport but doesn't
offer routing for folding bike's such as [Bromptons](http://www.brompton.co.uk)
which can be taken on public transport when it's quicker than cycling directly.


## Routing
Currently, the routing uses Google's transit directions and distance matrix to
build a graph of the route.  It finds the shortest path using a simple label
setting algorithm.


A graphviz representation of the route is logged the console for debugging.
