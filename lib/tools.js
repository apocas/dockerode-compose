module.exports = {
  'sortServices': function (recipe) {
    var order = [];
    var serviceNames = Object.keys(recipe.services || []);

    while (order.length !== serviceNames.length) {
      for (var serviceName of serviceNames) {
        if(order.indexOf(serviceName) === -1) {
          insertService(serviceName, recipe.services[serviceName].depends_on || [], order)
        }
      }
    }
    return order;
  }
}

function insertService(serviceName, depends_on, order) {
  var position = -1;
  for (var serviceDep of depends_on) {
    var p = order.indexOf(serviceDep);
    if (p === -1) return;
    if (p > position) position = p;
  }
  order.splice(position + 1, 0, serviceName);
}
