#!/bin/sh

set -e

exec >(logger -s -t $(basename $0)) 2>&1

PATH=$PATH:/sbin:/bin:/usr/sbin:/usr/bin:/usr/local/sbin:/usr/local/bin

# Path to the vtysh binary
VTYSH=$(which vtysh)

# Path to the bgp json output
BGP_IPV4_JSON_OUTPUT=/tmp/bgp_ipv4_$datetime.json
BGP_IPV6_JSON_OUTPUT=/tmp/bgp_ipv6_$datetime.json

BGP_IPV4_JSON=/tmp/bgp_ipv4.json
BGP_IPV6_JSON=/tmp/bgp_ipv6.json

datetime=$(date +%Y%m%d%H%M%S)

vtysh -c 'show ip bgp ipv4 unicast json' > $BGP_IPV4_JSON_OUTPUT || {
  rm -f $BGP_IPV4_JSON_OUTPUT
  echo "Error: Unable to get BGP IPv4 JSON output"
  exit 1
}

# Check if the JSON output is valid
jq empty $BGP_IPV4_JSON_OUTPUT > /dev/null 2>&1 || {
  rm -f $BGP_IPV4_JSON_OUTPUT
  echo "Error: Invalid BGP IPv4 JSON output"
  exit 1
}

mv $BGP_IPV4_JSON_OUTPUT $BGP_IPV4_JSON

datetime=$(date +%Y%m%d%H%M%S)

vtysh -c 'show ip bgp ipv6 unicast json' > $BGP_IPV6_JSON_OUTPUT || {
  rm -f $BGP_IPV6_JSON_OUTPUT
  echo "Error: Unable to get BGP IPv6 JSON output"
  exit 1
}

# Check if the JSON output is valid
jq empty $BGP_IPV6_JSON_OUTPUT > /dev/null 2>&1 || {
  rm -f $BGP_IPV6_JSON_OUTPUT
  echo "Error: Invalid BGP IPv6 JSON output"
  exit 1
}

mv $BGP_IPV6_JSON_OUTPUT $BGP_IPV6_JSON
