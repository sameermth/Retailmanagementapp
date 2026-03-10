import java.util.List;

public class Employee {

    private String name;

    private List<Address> addressList;


    public Employee(String name, List<Address> addressList) {

        this.name = name;

        this.addressList = addressList;

    }
//Getters & setters

}


public class Address {
    1

    private String buildingNo;

    private String StreetName;

    private String cityName;

//Getters & setters

    public Address(String cityName) {

        this.cityName = cityName;

    }

}


import java.util.List;
public class Main {

    public static void main(String[] args) {

        Employee e1 = new Employee("e1", List.of(new Address("BLR"),new Address("BOM")));

        Employee e2 = new Employee("e2", List.of(new Address("BOM"),new Address("HYD")));

        Employee e3 = new Employee("e3", List.of(new Address("HYD"),new Address("CHN")));
        List<Employee> empList = List.of(e1, e2, e3);
        //Print employee name who are part of HYD

        empList.stream().filter( emp -> emp.getAddress().stream()
                .anyMatch( add -> add.getCityName().equalIgnoreCase("HYD"))).foreach( emp -> System.out.println(emp.getName()));


        select name from Employee

        Employee  -> address - employeeId

        select name from employee join address on employee.id = address.employeeId where address.city = "HYD";

        empList.stream()
                .flatMap( emp -> emp.getAddress())
                .map( add -> add.getCityName()).toSet().stream().forEach( city -> System.out.println(city));

        select count(1) as empCount, city from address group by address.city;

        Instant
                DateTime


        ac no,
                min max


                        entry.stre.fil(


    }

}