---
order: 76
---

 # 一、向量化表示编程

## 1.基本的实现（由于数学知识的缺乏，不能很好的理解）

```python
import numpy as np
m = 5
x = np.matrix(range(1, m + 1))
print(x)
error = np.random.normal(0, 6, (1,m))
print(error)
y = 2 + x + error
print(y)
print(x.shape, y.shape,sep='\n')
import matplotlib.pyplot as plt
x_orignal = list(x.T)
y_orignal = list(y.T)
plt.scatter(x_orignal,y_orignal) #s散点图
plt.xlim(-1,5)
plt.xlabel('X')
plt.ylabel('Y')
plt.title("example")
plt.show()
x = x.T;y = y.T
print(x,y,sep='\n\n')
X = np.hstack((np.ones((5,1)),x))
theta = np.ones((2,1))
print(theta)
np.dot(X, theta)
error = np.dot(X, theta) - y
print(error)
print(np.multiply(error,x))
derivs = np.multiply(error,X)
print(derivs)
deriv_mean = np.mean(derivs,axis=0)
print(deriv_mean)
deriv_mean = deriv_mean.T
print(deriv_mean)
loss = np.mean(np.square(error),axis=0)
print(loss)

```

## 2. 类的定义

```python
class Powerfunctions(object):    
    #######                  # self 是一固定格式，代表公共变量标志，后面的 d 可看成具体的公共变量。
    def __init__(self,n):  # 该块是实例化这个class执行的内容  (1) 一个实例化这部分只执行一次
        
        self.n = n                # 通常这一部分定义共同的class的变量, self定义类里通用的变量 
                                  # 若未加self，后面无法调用，只能在类def__init__ 块使用
        print("实例化类 Powerfunctions")        
    #######
    name = "power functions"        # name 和a 称为类functions 的属性     (2)                    
    a = 1    
    
    ######## 存储的方法               # 每个方法第一个参数必须是self         (3)   
                                      # powerfunc,pluspower,...称为类的方法分 
    def powerfunc(self):          # 每个方法第一个参数必须是self，不管该方法需不需要变量
        return  "Hello "+ self.name    # 调用类的属性,要加前缀 self
    def pluspower(self,x,y):         #  除了用类里的变量self，还需要用私有变量 x，y                     
        return (x+y)**self.n
    def minuspower(self,x,y):
        return (x-y)**self.n
    def multiplypower(self,x,y):
        return (x*y)**self.n  
    def dividepower(self,x,y):
        return (x/y)**self.n  # 总之class 里基本只存两样东西，属性和方法 
```

## 3.函数其他的调用方法

```python
print(Powerfunctions.pluspower(f, 2, 3))
```

## 4. 继承

1. 单继承

   ```python
   ## 把Powerfunctions 作为父类，这样就可以调用Powerfunctions的属性和方法
   class Mod(Powerfunctions):
       def __init__(self,power,divisor):
           #Powerfunctions.__init__(self,power)   # 通过子类把参数传给父类
           super().__init__(power)  
           self.divisor= divisor  
           
       name1 = "mod"                      # 属性
           
       def modpluspower(self,x,y):  # 方法
           return self.pluspower(x,y) // self.divisor    # 继承方法和继承的属性引用的格式
       def modminuspower(self,x,y):  
           return self.minuspower(x,y) // self.divisor  
       def modmultiplypower(self,x,y):  
           return self.multiplypower(x,y) // self.divisor  
       def moddividepower(self,x,y):  
           return self.dividepower(x,y) // self.divisor  
   ```

2. 多继承

   ```python
   class A(object):
       def __init__(self):
           pass
       def methodA(self):
           print("enter A")
           
   class B():
       def __init__(self):
           pass
       def methodB(self):
           print("enter B")
   
   class C(A,B):
       def __init__(self):
           A.__init__(self)  # super(C,self).__init__()
           B.__init__(self)
           
       def methodC(self):
           print("enter C")
   ```

   